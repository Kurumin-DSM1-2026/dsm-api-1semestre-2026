FROM python:3.12-slim
WORKDIR /srv/backend/app
COPY backend/app/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/app/ /srv/backend/app/
COPY frontend/ /srv/frontend/
EXPOSE 5000
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]
