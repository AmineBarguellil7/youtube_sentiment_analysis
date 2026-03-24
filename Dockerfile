FROM python:3.11-slim-bookworm

WORKDIR /app

COPY . /app

# Add this line to install libgomp
RUN apt-get update && apt-get install -y libgomp1

RUN pip install -r requirements.txt
RUN pip install awscli
RUN python -m nltk.downloader stopwords wordnet

RUN chmod +x start.sh

CMD ["./start.sh"]