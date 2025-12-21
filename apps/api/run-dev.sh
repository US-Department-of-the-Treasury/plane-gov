#!/bin/bash
set -a
source .env
set +a
/Users/corcoss/code/plane/apps/api/venv/bin/python manage.py runserver 8000
