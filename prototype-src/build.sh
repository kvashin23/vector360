#!/usr/bin/env bash
# Собирает главную и страницы объектов из общего шаблона.
set -euo pipefail
node "$(dirname "$0")/build.js"
