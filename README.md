# Opus Appeal Tracker Flow

Production-style modular Flask + React application for healthcare denial management organization onboarding, authentication, and user administration.

## Stack

- Python 3.13.7
- Flask 3.1.2
- PostgreSQL
- React + Vite

## Backend Setup

1. Create `C:/env/Appealio Product/appealio.env`:

```env
APPEALIO_DB_HOST=localhost
APPEALIO_DB_PORT=5432
APPEALIO_DB_USER=postgres
PASSWORD=your-password
APPEALIO_DB_NAME=opus_appeal_tracker
```

The backend reads database values from this `appealio.env` file.

2. Activate your preferred Python environment, then install dependencies:

```bash
cd backend
pip install -r requirements.txt
```

3. Create the PostgreSQL database in pgAdmin using `APPEALIO_DB_NAME`.

4. Run migrations:

```bash
flask --app app.py db init
flask --app app.py db migrate -m "initial schema"
flask --app app.py db upgrade
```

5. Start the API:

```bash
python app.py
```

## Frontend Setup

```bash
cd frontend
npm install
npm start
```

`npm start` runs both the Flask backend and React frontend with `concurrently`.
Frontend variables are maintained in `frontend/.env`.

## Notes

- Replace `frontend/src/assets/opus_logo.jfif` with the production logo asset.
- First organization registration creates the organization and its initial admin user.
- Admins can add users and manage users within their organization.
- Users with `first_login_required=true` must update their password before reaching the dashboard.
