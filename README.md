# ImaginAI Rewrite

ImaginAI is being rewritten as a modern interactive AI storytelling platform.

The definitive rewrite documentation is in `docs/rewrite/`. Start with `docs/rewrite/README.md`.

The old implementation has been preserved under `legacy/` as reference material only. See `docs/rewrite/14_LEGACY_REFERENCE_MAP.md` for what to reference and what not to copy.

Active dependencies/reference data:

- `lib/rotator_library/` - LLM communications library
- `lib/proxy_app/` - proxy reference only
- `AID/` - AI Dungeon import samples

## Current Rewrite Scaffold

- Backend: `backend/` Django + Django Ninja service-layer API.
- Frontend: `frontend/` React + Vite + TypeScript + TanStack Query.
- Legacy code remains under `legacy/` and should not be refactored in place.

## Local Commands

Backend:

```bash
python -m pip install -r backend/requirements.txt
python backend/manage.py migrate
python backend/manage.py seed_dev_admin
python backend/manage.py load_default_scenario
python backend/manage.py runserver
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Set `IMAGINAI_FAKE_LLM=1` for local gameplay without provider credentials.
