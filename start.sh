#!/bin/bash
aws s3 cp s3://youtube-sentiment-bucket/lgbm_model.pkl /app/lgbm_model.pkl
aws s3 cp s3://youtube-sentiment-bucket/tfidf_vectorizer.pkl /app/tfidf_vectorizer.pkl
python3 flask_app/app.py
