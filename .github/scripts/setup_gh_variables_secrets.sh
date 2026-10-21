#!/usr/bin/env bash
#
# setup_gh_variables_and_secrets.sh — pousse les variables et secrets GitHub Actions
# décrits dans des fichiers YAML.
#
#   variables.yml : valeurs NON secrètes, versionnées (modèle : variables.example.yml)
#   secrets.yml   : valeurs réelles des secrets, JAMAIS versionné (modèle : secrets.example.yml)
#
# Les deux fichiers ont la même forme :
#
#   repository:            # variables/secrets du dépôt
#     NOM: valeur
#   environments:          # variables/secrets d'un environnement
#     prod:
#       NOM: valeur
#
# Les environnements doivent exister : crée-les d'abord avec setup_gh_repo.sh.
# Le script est idempotent (`gh variable set` / `gh secret set` créent ou remplacent).
# Il ne supprime rien : une clé retirée du YAML reste définie sur GitHub.
#
# Usage :
#   ./setup_gh_variables_and_secrets.sh [options]
#
# Prérequis : bash, gh (connecté via `gh auth login`, droits admin sur le dépôt),
#             yq (version de Mike Farah : https://github.com/mikefarah/yq).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VARIABLES_FILE="${VARIABLES_FILE:-${SCRIPT_DIR}/../vars/variables.yaml}"
SECRETS_FILE="${SECRETS_FILE:-${SCRIPT_DIR}/../vars/secrets.yaml}"
REPO="${REPO:-}"
DRY_RUN=false
ONLY=all   # all | variables | secrets

SET_COUNT=0
SKIP_COUNT=0

usage() {
  cat <<'EOF'
Usage : setup_gh_variables_and_secrets.sh [options]

Options :
  -n, --dry-run            affiche ce qui serait appliqué, sans rien modifier
                           (les valeurs des secrets ne sont jamais affichées)
      --variables FICHIER  fichier de variables (défaut : ../vars/variables.yml)
      --secrets FICHIER    fichier de secrets   (défaut : ../vars/secrets.yml)
      --only variables|secrets   ne traiter que l'un des deux
  -R, --repo OWNER/REPO    dépôt cible (défaut : dépôt du répertoire courant)
  -h, --help               affiche cette aide
EOF
}

die() { echo "ERREUR : $*" >&2; exit 1; }
log() { printf '%s\n' "$*"; }

# --- Arguments ---------------------------------------------------------------
while [ $# -gt 0 ]; do
  case "$1" in
    -n|--dry-run) DRY_RUN=true ;;
    --variables)  VARIABLES_FILE="${2:?valeur manquante pour $1}"; shift ;;
    --secrets)    SECRETS_FILE="${2:?valeur manquante pour $1}"; shift ;;
    --only)       ONLY="${2:?valeur manquante pour $1}"; shift ;;
    -R|--repo)    REPO="${2:?valeur manquante pour $1}"; shift ;;
    -h|--help)    usage; exit 0 ;;
    *)            echo "Option inconnue : $1" >&2; usage >&2; exit 2 ;;
  esac
  shift
done
case "$ONLY" in all|variables|secrets) ;; *) die "--only doit valoir variables ou secrets (lu : '$ONLY')" ;; esac

# --- Prérequis ---------------------------------------------------------------
command -v gh >/dev/null 2>&1 || die "'gh' est introuvable. Installe GitHub CLI : https://cli.github.com"
command -v yq >/dev/null 2>&1 || die "'yq' est introuvable. Installe la version de Mike Farah : https://github.com/mikefarah/yq"
yq --version 2>&1 | grep -qi mikefarah \
  || die "ce 'yq' n'est pas celui de Mike Farah (le yq de pip n'est pas compatible)."
gh auth status >/dev/null 2>&1 || die "'gh' n'est pas connecté. Lance : gh auth login"

if [ -z "$REPO" ]; then
  REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner') \
    || die "dépôt introuvable depuis ce répertoire. Utilise --repo OWNER/REPO."
fi
[[ "$REPO" =~ ^[^/[:space:]]+/[^/[:space:]]+$ ]] || die "dépôt invalide : '$REPO' (attendu : OWNER/REPO)"

# --- Garde-fous --------------------------------------------------------------
# Refuse de continuer si le fichier de secrets est suivi par git : ses valeurs
# seraient dans l'historique. Avertit s'il n'est pas dans .gitignore.
guard_secrets_file() {
  local file="$1" dir base
  dir=$(dirname "$file")
  base=$(basename "$file")
  if git -C "$dir" ls-files --error-unmatch -- "$base" >/dev/null 2>&1; then
    die "$file est suivi par git. Retire-le de l'index : git rm --cached $base
       (et change les secrets qu'il contient s'il a déjà été poussé)."
  fi
  if git -C "$dir" rev-parse --is-inside-work-tree >/dev/null 2>&1 \
     && ! git -C "$dir" check-ignore -q -- "$base"; then
    log "  ATTENTION : $base n'est pas dans .gitignore. Ajoute-le pour ne pas le commiter par erreur."
  fi
}

# GitHub : lettres, chiffres et _ ; ne commence pas par un chiffre ni par GITHUB_.
validate_name() {
  [[ "$1" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || die "nom invalide : '$1' (lettres, chiffres et _ uniquement, sans commencer par un chiffre)"
  case "$1" in GITHUB_*|github_*) die "nom réservé : '$1' (le préfixe GITHUB_ est interdit)" ;; esac
}

# --- Traitement --------------------------------------------------------------
# set_item TYPE NOM VALEUR [ENVIRONNEMENT]   (TYPE : variable | secret)
set_item() {
  local kind="$1" name="$2" value="$3" env="${4:-}"
  local scope="dépôt"
  local -a scope_args=(--repo "$REPO")
  if [ -n "$env" ]; then
    scope="environnement $env"
    scope_args+=(--env "$env")
  fi

  if [ "$DRY_RUN" = true ]; then
    if [ "$kind" = variable ]; then
      log "  [dry-run] variable $name = $value  ($scope)"
    else
      log "  [dry-run] secret   $name = ***  ($scope)"
    fi
  elif [ "$kind" = variable ]; then
    gh variable set "$name" "${scope_args[@]}" --body "$value" >/dev/null
    log "  variable $name = $value  ($scope)"
  else
    # Le secret passe par l'entrée standard : il n'apparaît pas dans la liste des processus.
    printf '%s' "$value" | gh secret set "$name" "${scope_args[@]}" >/dev/null
    log "  secret   $name = ***  ($scope)"
  fi
  SET_COUNT=$((SET_COUNT + 1))
}

# apply_section TYPE FICHIER CHEMIN_YAML [ENVIRONNEMENT]
apply_section() {
  local kind="$1" file="$2" path="$3" env="${4:-}"
  local names name value
  names=$(yq "$path // {} | keys | .[]" "$file" | tr -d '\r')
  while IFS= read -r name; do
    [ -z "$name" ] && continue
    validate_name "$name"
    value=$(yq "${path}.\"${name}\"" "$file")
    if [ -z "$value" ] || [ "$value" = "null" ]; then
      log "  - $name : valeur vide, ignorée"
      SKIP_COUNT=$((SKIP_COUNT + 1))
      continue
    fi
    set_item "$kind" "$name" "$value" "$env"
  done <<< "$names"
}

# Vérifie que tous les environnements du fichier existent, AVANT de rien écrire :
# évite une application à moitié faite.
check_environments() {
  local file="$1" envs env missing=""
  envs=$(yq '.environments // {} | keys | .[]' "$file" | tr -d '\r')
  while IFS= read -r env; do
    [ -z "$env" ] && continue
    [[ "$env" =~ ^[A-Za-z0-9._-]+$ ]] || die "nom d'environnement non supporté : '$env'"
    if ! gh api "repos/$REPO/environments/$env" >/dev/null 2>&1; then
      missing+=" $env"
    fi
  done <<< "$envs"
  [ -z "$missing" ] && return 0
  if [ "$DRY_RUN" = true ]; then
    log "  ATTENTION : environnement(s) absent(s) de $REPO :$missing (à créer avec setup_gh_repo.sh)"
  else
    die "environnement(s) absent(s) de $REPO :$missing
       Déclare-les dans repo-config.yml puis lance setup_gh_repo.sh."
  fi
}

# process_file TYPE FICHIER
process_file() {
  local kind="$1" file="$2"
  log "=== ${kind}s : $file ==="
  yq '.' "$file" >/dev/null || die "YAML invalide : $file"

  check_environments "$file"
  apply_section "$kind" "$file" ".repository"

  local envs env
  envs=$(yq '.environments // {} | keys | .[]' "$file" | tr -d '\r')
  while IFS= read -r env; do
    [ -z "$env" ] && continue
    apply_section "$kind" "$file" ".environments.\"${env}\"" "$env"
  done <<< "$envs"
}

# run_kind TYPE FICHIER OPTION_ONLY : traite un fichier, ou l'ignore s'il manque
# (sauf si l'utilisateur l'a demandé explicitement avec --only).
run_kind() {
  local kind="$1" file="$2"
  if [ ! -f "$file" ]; then
    if [ "$ONLY" = "${kind}s" ]; then
      die "fichier introuvable : $file"
    fi
    log "=== ${kind}s : $file introuvable, ignoré ==="
    return 0
  fi
  if [ "$kind" = secret ]; then
    guard_secrets_file "$file"
  fi
  process_file "$kind" "$file"
}

# --- Exécution ---------------------------------------------------------------
log "Dépôt cible : $REPO"
if [ "$DRY_RUN" = true ]; then
  log "Mode --dry-run : rien ne sera modifié."
fi

if [ "$ONLY" != secrets ]; then
  run_kind variable "$VARIABLES_FILE"
fi
if [ "$ONLY" != variables ]; then
  run_kind secret "$SECRETS_FILE"
fi

if [ "$DRY_RUN" = true ]; then
  log "Simulation terminée : $SET_COUNT à appliquer, $SKIP_COUNT ignoré(s)."
else
  log "Terminé : $SET_COUNT appliqué(s), $SKIP_COUNT ignoré(s)."
fi
