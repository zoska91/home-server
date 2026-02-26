FROM python:3.11-slim

WORKDIR /discord_bot

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "-m", "watchfiles", "python main.py", "."]