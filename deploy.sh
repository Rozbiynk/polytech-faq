#!/usr/bin/env bash
# Сайт выкладывается сам: push в main → GitHub Actions собирает → ветка deploy → сервер забирает за ~1 мин.
# Этот скрипт: проверить сборку локально и отправить свои коммиты (правки из /edit сначала подтягиваются).
set -euo pipefail
cd "$(dirname "$0")"
git pull --rebase -q
pnpm build >/dev/null
git push -q
echo "отправлено; сайт обновится через 2–3 мин: https://faq.rozb.pw/ (ход сборки: gh run watch)"
