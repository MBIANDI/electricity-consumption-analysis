"""Allow `python -m electricity_analysis`."""

import sys

from electricity_analysis.api.cli import main

sys.exit(main())
