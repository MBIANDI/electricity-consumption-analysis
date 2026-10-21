#!/usr/bin/env bash
#
# setup_gh_repo.sh — applique .github/vars/repo-config.yml au dépôt GitHub.
#
# Ce que le script configure :
#   1. la stratégie de merge (squash / merge commit / rebase, suppression des branches)
#   2. la suppression des protections de branche "classiques" (optionnel, destructif)
#   3. les rulesets de protection de branche (revues + checks obligatoires)
#   4. GitHub Pages
#   5. les environnements de déploiement et leurs règles de branches
#
# Les variables et secrets sont gérés par setup_gh_variables_and_secrets.sh.
#
# Le script est idempotent : le relancer remet le dépôt dans l'état décrit par le
# fichier, sans rien créer en double. Un réglage modifié à la main dans l'interface
# GitHub est donc écrasé au prochain passage.
#
# Usage :
#   ./setup_gh_repo.sh [--dry-run] [--config FICHIER] [--repo OWNER/REPO]
#
# Prérequis : bash, gh (connecté via `gh auth login`, droits admin sur le dépôt),
#             yq (version de Mike Farah : https://github.com/mikefarah/yq).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${CONFIG_FILE:-${SCRIPT_DIR}/../vars/repo-config.yaml}"
REPO="${REPO:-}"
DRY_RUN=false

usage() {
  cat <<'EOF'
Usage : setup_gh_repo.sh [options]

Options :
  -n, --dry-run          affiche ce qui serait appliqué, sans rien modifier
                         (les lectures vers l'API GitHub sont quand même faites)
  -c, --config FICHIER   fichier de configuration (défaut : ../vars/repo-config.yml)
  -R, --repo OWNER/REPO  dépôt cible (défaut : dépôt du répertoire courant)
  -h, --help             affiche cette aide
EOF
}

die() { echo "ERREUR : $*" >&2; exit 1; }
log() { printf '%s\n' "$*"; }

# --- Arguments ---------------------------------------------------------------
while [ $# -gt 0 ]; do
  case "$1" in
    -n|--dry-run) DRY_RUN=true ;;
    -c|--config)  CONFIG_FILE="${2:?valeur manquante pour $1}"; shift ;;
    -R|--repo)    REPO="${2:?valeur manquante pour $1}"; shift ;;
    -h|--help)    usage; exit 0 ;;
    *)            echo "Option inconnue : $1" >&2; usage >&2; exit 2 ;;
  esac
  shift
done

# --- Prérequis ---------------------------------------------------------------
command -v gh >/dev/null 2>&1 || die "'gh' est introuvable. Installe GitHub CLI : https://cli.github.com"
command -v yq >/dev/null 2>&1 || die "'yq' est introuvable. Installe la version de Mike Farah : https://github.com/mikefarah/yq"
yq --version 2>&1 | grep -qi mikefarah \
  || die "ce 'yq' n'est pas celui de Mike Farah (le yq de pip n'est pas compatible)."
gh auth status >/dev/null 2>&1 || die "'gh' n'est pas connecté. Lance : gh auth login"
[ -f "$CONFIG_FILE" ] || die "fichier de configuration introuvable : $CONFIG_FILE"
yq '.' "$CONFIG_FILE" >/dev/null || die "YAML invalide : $CONFIG_FILE"

if [ -z "$REPO" ]; then
  REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner') \
    || die "dépôt introuvable depuis ce répertoire. Utilise --repo OWNER/REPO."
fi
[[ "$REPO" =~ ^[^/[:space:]]+/[^/[:space:]]+$ ]] || die "dépôt invalide : '$REPO' (attendu : OWNER/REPO)"

WORKDIR=$(mktemp -d "${TMPDIR:-/tmp}/ghsetup.XXXXXX")
trap 'rm -rf "$WORKDIR"' EXIT

# --- Lecture de la configuration ---------------------------------------------
# cfg CHEMIN DÉFAUT : valeur du YAML, ou DÉFAUT si la clé est absente.
# On n'utilise PAS l'opérateur `//` de yq : il traite `false` comme absent, donc
# `.x // true` renverrait true même si le fichier dit `x: false`.
cfg() {
  local v
  v=$(yq "$1" "$CONFIG_FILE")
  if [ -z "$v" ] || [ "$v" = "null" ]; then printf '%s' "$2"; else printf '%s' "$v"; fi
}

# cfg_bool CHEMIN DÉFAUT : comme cfg, mais exige true ou false.
cfg_bool() {
  local v
  v=$(cfg "$1" "$2")
  case "$v" in
    true|false) printf '%s' "$v" ;;
    *) die "$1 doit valoir true ou false (valeur lue : '$v')" ;;
  esac
}

# Raccourcis pour branch_protection.<branche>.<clé>
bp()      { cfg      ".branch_protection.\"$1\".$2" "$3"; }
bp_bool() { cfg_bool ".branch_protection.\"$1\".$2" "$3"; }

check_keys() {
  local file="$1" path="$2"
  shift 2
  local allowed=" $* "
  local label="$path" key
  if [ "$path" = . ]; then label="racine du fichier"; fi
  while IFS= read -r key; do
    [ -z "$key" ] && continue
    case "$allowed" in
      *" $key "*) ;;
      *) die "clé inconnue '$key' dans $label de $file
       Clés autorisées : $*
       Faute de frappe ?" ;;
    esac
  done < <(yq "$path // {} | keys | .[]" "$file" | tr -d '\r')
}

# Contrôle toutes les sections du fichier avant de modifier quoi que ce soit.
validate_config() {
  check_keys "$CONFIG_FILE" . merge classic_branch_protection branch_protection pages environments
  check_keys "$CONFIG_FILE" .merge squash merge_commit rebase delete_branch_on_merge auto_merge
  check_keys "$CONFIG_FILE" .pages enabled

  local name
  while IFS= read -r name; do
    [ -z "$name" ] && continue
    check_keys "$CONFIG_FILE" ".branch_protection.\"$name\"" \
      required_approving_review_count require_code_owner_review dismiss_stale_reviews_on_push \
      required_review_thread_resolution admin_bypass strict_required_checks required_checks
  done < <(yq '.branch_protection // {} | keys | .[]' "$CONFIG_FILE" | tr -d '\r')

  while IFS= read -r name; do
    [ -z "$name" ] && continue
    check_keys "$CONFIG_FILE" ".environments.\"$name\"" branch_policy branches
  done < <(yq '.environments // {} | keys | .[]' "$CONFIG_FILE" | tr -d '\r')
}

# --- Écriture vers l'API (respecte --dry-run) --------------------------------
# api_write MÉTHODE URL [FICHIER_JSON]
# Le corps passe par --input (JSON) et non par --field : --field transforme les
# booléens en chaînes ("false" au lieu de false), ce que l'API refuse.
api_write() {
  local method="$1" url="$2" payload="${3:-}"
  if [ "$DRY_RUN" = true ]; then
    log "  [dry-run] ${method} ${url}"
    if [ -n "$payload" ]; then
      yq -p=json -o=json '.' "$payload" | sed 's/^/      /'
    fi
    return 0
  fi
  if [ -n "$payload" ]; then
    gh api "$url" --method "$method" --input "$payload" --silent
  else
    gh api "$url" --method "$method" --silent
  fi
}

# --- 0. Sonde de permissions -------------------------------------------------
# Renvoie à l'API les réglages actuels du dépôt, inchangés : si le jeton n'a pas le
# droit Administration, on échoue ici, avant toute vraie modification.
probe_permissions() {
  log "=== Sonde de permissions ==="
  local current
  current=$(gh api "repos/$REPO" \
    --jq '{allow_squash_merge, allow_merge_commit, allow_rebase_merge, delete_branch_on_merge, allow_auto_merge}')
  if ! printf '%s' "$current" | gh api "repos/$REPO" --method PATCH --input - --silent; then
    die "impossible de modifier $REPO : il faut les droits admin (Administration: write pour une GitHub App)."
  fi
  log "  Administration: write OK"
}

# --- 1. Stratégie de merge ---------------------------------------------------
apply_merge() {
  log "=== Stratégie de merge ==="
  local squash merge_commit rebase delete_branch auto_merge
  squash=$(cfg_bool .merge.squash true)
  merge_commit=$(cfg_bool .merge.merge_commit false)
  rebase=$(cfg_bool .merge.rebase false)
  delete_branch=$(cfg_bool .merge.delete_branch_on_merge true)
  auto_merge=$(cfg_bool .merge.auto_merge false)

  if [ "$squash" = false ] && [ "$merge_commit" = false ] && [ "$rebase" = false ]; then
    die "merge : au moins une méthode (squash, merge_commit, rebase) doit être à true."
  fi

  # Le commit squashé reprend le titre et la description de la PR.
  local squash_fields=""
  if [ "$squash" = true ]; then
    squash_fields=',
  "squash_merge_commit_title": "PR_TITLE",
  "squash_merge_commit_message": "PR_BODY"'
  fi

  local payload="$WORKDIR/merge.json"
  cat > "$payload" <<EOF
{
  "allow_squash_merge": $squash,
  "allow_merge_commit": $merge_commit,
  "allow_rebase_merge": $rebase,
  "delete_branch_on_merge": $delete_branch,
  "allow_auto_merge": $auto_merge$squash_fields
}
EOF
  api_write PATCH "repos/$REPO" "$payload"
  log "  squash=$squash merge_commit=$merge_commit rebase=$rebase delete_on_merge=$delete_branch auto_merge=$auto_merge"
}

# --- 2. Protections de branche classiques ------------------------------------
# La politique d'environnement "protected" de GitHub se base sur les protections
# classiques, pas sur les rulesets. Avec `classic_branch_protection: forbidden`, le
# script supprime toute protection classique de toutes les branches, sans confirmation.
sweep_classic_protection() {
  local policy
  policy=$(cfg .classic_branch_protection allowed)
  log "=== Protections classiques (classic_branch_protection: $policy) ==="
  case "$policy" in
    allowed)   log "  ignorées (laissées telles quelles)"; return 0 ;;
    forbidden) ;;
    *)         die "classic_branch_protection doit valoir allowed ou forbidden (lu : '$policy')" ;;
  esac

  local branch
  while IFS= read -r branch; do
    [ -z "$branch" ] && continue
    if gh api "repos/$REPO/branches/${branch}/protection" >/dev/null 2>&1; then
      api_write DELETE "repos/$REPO/branches/${branch}/protection"
      log "  protection classique supprimée sur '${branch}'"
    fi
  done < <(gh api "repos/$REPO/branches" --paginate --jq '.[].name' | tr -d '\r')
}

# --- 3. Rulesets de protection de branche ------------------------------------
apply_one_ruleset() {
  local branch="$1"
  [[ "$branch" =~ ^[A-Za-z0-9._/-]+$ ]] || die "nom de branche non supporté : '$branch'"

  local name="${branch//\//-}-protection"
  local reviews code_owner dismiss_stale threads strict admin_bypass
  reviews=$(bp "$branch" required_approving_review_count 0)
  [[ "$reviews" =~ ^[0-9]+$ ]] && [ "$reviews" -le 10 ] \
    || die "branch_protection.$branch.required_approving_review_count doit être un entier entre 0 et 10 (lu : '$reviews')"
  code_owner=$(bp_bool "$branch" require_code_owner_review false)
  dismiss_stale=$(bp_bool "$branch" dismiss_stale_reviews_on_push false)
  threads=$(bp_bool "$branch" required_review_thread_resolution false)
  strict=$(bp_bool "$branch" strict_required_checks false)
  admin_bypass=$(bp_bool "$branch" admin_bypass false)

  # Checks obligatoires : liste de noms -> [{"context": "nom"}, ...]
  local checks_json checks_count
  checks_json=$(yq -o=json -I=0 ".branch_protection.\"$branch\".required_checks // [] | map({\"context\": .})" "$CONFIG_FILE")
  checks_count=$(yq ".branch_protection.\"$branch\".required_checks // [] | length" "$CONFIG_FILE")

  # Règle "pull request obligatoire", puis (si des checks sont déclarés) la règle de checks.
  # Une liste de checks vide serait rejetée par l'API : on n'émet alors pas la règle.
  local rules
  rules='{"type":"pull_request","parameters":{"required_approving_review_count":'"$reviews"
  rules+=',"dismiss_stale_reviews_on_push":'"$dismiss_stale"
  rules+=',"require_code_owner_review":'"$code_owner"
  rules+=',"require_last_push_approval":false'
  rules+=',"required_review_thread_resolution":'"$threads"'}}'
  if [ "$checks_count" -gt 0 ]; then
    rules+=',{"type":"required_status_checks","parameters":{"required_status_checks":'"$checks_json"
    rules+=',"strict_required_status_checks_policy":'"$strict"'}}'
  fi

  # Rôle intégré "Admin" (actor_id 5) : peut merger sans approbation, mais pas
  # pousser directement (bypass_mode: pull_request).
  local bypass='[]'
  if [ "$admin_bypass" = true ]; then
    bypass='[{"actor_id":5,"actor_type":"RepositoryRole","bypass_mode":"pull_request"}]'
  fi

  local payload="$WORKDIR/ruleset-${name//\//-}.json"
  cat > "$payload" <<EOF
{
  "name": "$name",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": $bypass,
  "conditions": { "ref_name": { "include": ["refs/heads/$branch"], "exclude": [] } },
  "rules": [ $rules ]
}
EOF

  # Le ruleset existe-t-il déjà ? Oui -> PUT (mise à jour), non -> POST (création).
  local list existing_id
  if ! list=$(gh api "repos/$REPO/rulesets" --paginate --jq '.[] | "\(.id)\t\(.name)"' 2>&1); then
    die "impossible de lister les rulesets de $REPO : $list
       (les rulesets dépendent de ton offre GitHub pour un dépôt privé)"
  fi
  existing_id=$(printf '%s\n' "$list" | tr -d '\r' | awk -F'\t' -v n="$name" '$2 == n { print $1; exit }')

  local action
  if [ -n "$existing_id" ]; then
    action="mis à jour"
    api_write PUT "repos/$REPO/rulesets/$existing_id" "$payload"
  else
    action="créé"
    api_write POST "repos/$REPO/rulesets" "$payload"
  fi
  log "  ${branch} : ruleset '${name}' ${action} (revues=${reviews}, checks=${checks_count}, admin_bypass=${admin_bypass})"
}

apply_rulesets() {
  log "=== Protection de branches (rulesets) ==="
  local branches branch
  branches=$(yq '.branch_protection // {} | keys | .[]' "$CONFIG_FILE" | tr -d '\r')
  if [ -z "$branches" ]; then
    log "  aucune branche déclarée dans branch_protection"
    return 0
  fi
  while IFS= read -r branch; do
    [ -z "$branch" ] && continue
    apply_one_ruleset "$branch"
  done <<< "$branches"
}

# --- 4. GitHub Pages ---------------------------------------------------------
apply_pages() {
  local enabled
  enabled=$(cfg_bool .pages.enabled false)
  log "=== GitHub Pages (enabled=$enabled) ==="
  [ "$enabled" = true ] || return 0

  local payload="$WORKDIR/pages.json"
  echo '{"build_type": "workflow"}' > "$payload"
  if gh api "repos/$REPO/pages" >/dev/null 2>&1; then
    api_write PUT "repos/$REPO/pages" "$payload"
    log "  build_type=workflow assuré (déploiement par GitHub Actions)"
  else
    api_write POST "repos/$REPO/pages" "$payload"
    log "  Pages activé (déploiement par GitHub Actions)"
  fi
}

# --- 5. Environnements de déploiement ----------------------------------------
# Aligne les branches autorisées d'un environnement `custom` sur la liste du YAML :
# ajoute les manquantes, supprime les autres.
sync_branch_policies() {
  local env="$1"
  local desired existing url
  url="repos/$REPO/environments/$env/deployment-branch-policies"

  desired=$(yq ".environments.\"$env\".branches // [] | .[]" "$CONFIG_FILE" | tr -d '\r')
  [ -n "$desired" ] || die "environnement '$env' : branch_policy 'custom' exige une liste 'branches'."

  # Si l'environnement n'existe pas encore (cas --dry-run), la liste est vide.
  existing=$(gh api "$url" --paginate --jq '.branch_policies[] | "\(.id)\t\(.name)"' 2>/dev/null | tr -d '\r' || true)

  local name payload
  while IFS= read -r name; do
    [ -z "$name" ] && continue
    [[ "$name" =~ ^[A-Za-z0-9._/*-]+$ ]] || die "environnement '$env' : nom de branche non supporté : '$name'"
    if printf '%s\n' "$existing" | awk -F'\t' -v n="$name" '$2 == n { f = 1 } END { exit !f }'; then
      log "    branche '$name' déjà autorisée"
    else
      payload="$WORKDIR/envpolicy-${env}.json"
      printf '{"name": "%s", "type": "branch"}\n' "$name" > "$payload"
      api_write POST "$url" "$payload"
      log "    branche '$name' autorisée"
    fi
  done <<< "$desired"

  local id existing_name
  while IFS=$'\t' read -r id existing_name; do
    [ -z "$id" ] && continue
    if ! printf '%s\n' "$desired" | grep -Fxq -- "$existing_name"; then
      api_write DELETE "$url/$id"
      log "    branche '$existing_name' retirée (absente du YAML)"
    fi
  done <<< "$existing"
}

apply_one_environment() {
  local env="$1"
  [[ "$env" =~ ^[A-Za-z0-9._-]+$ ]] || die "nom d'environnement non supporté : '$env'"

  local policy payload
  policy=$(cfg ".environments.\"$env\".branch_policy" open)
  payload="$WORKDIR/env-${env}.json"
  case "$policy" in
    open)
      echo '{"deployment_branch_policy": null}' > "$payload" ;;
    protected)
      echo '{"deployment_branch_policy": {"protected_branches": true, "custom_branch_policies": false}}' > "$payload" ;;
    custom)
      echo '{"deployment_branch_policy": {"protected_branches": false, "custom_branch_policies": true}}' > "$payload" ;;
    *)
      die "environnement '$env' : branch_policy doit valoir open, protected ou custom (lu : '$policy')" ;;
  esac

  # PUT crée l'environnement s'il n'existe pas, sinon le met à jour.
  api_write PUT "repos/$REPO/environments/$env" "$payload"
  log "  ${env} : branch_policy=${policy}"
  if [ "$policy" = custom ]; then
    sync_branch_policies "$env"
  fi
}

apply_environments() {
  log "=== Environnements ==="
  local envs env
  envs=$(yq '.environments // {} | keys | .[]' "$CONFIG_FILE" | tr -d '\r')
  if [ -z "$envs" ]; then
    log "  aucun environnement déclaré"
    return 0
  fi
  while IFS= read -r env; do
    [ -z "$env" ] && continue
    apply_one_environment "$env"
  done <<< "$envs"
}

# --- Exécution ---------------------------------------------------------------
log "Dépôt cible : $REPO"
log "Configuration : $CONFIG_FILE"
validate_config
if [ "$DRY_RUN" = true ]; then
  log "Mode --dry-run : rien ne sera modifié."
else
  probe_permissions
fi

apply_merge
sweep_classic_protection
apply_rulesets
apply_pages
apply_environments

log "Terminé."
