// popup.js

document.addEventListener("DOMContentLoaded", async () => {
  const outputDiv = document.getElementById("output");
  const API_KEY = 'AIzaSyAqW0jaDLIMzB7yxRV-Kur6ZR8HpINvei0';
  // const API_URL = 'http://my-elb-2062136355.us-east-1.elb.amazonaws.com:80';   
  // const API_URL = 'http://localhost:5000/';
  const API_URL = 'http://3.90.178.250:7080/';

  // Get the current tab's URL
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const url = tabs[0].url;
    const youtubeRegex = /^https:\/\/(?:www\.)?youtube\.com\/watch\?v=([\w-]{11})/;
    const match = url.match(youtubeRegex);

    if (match && match[1]) {
      const videoId = match[1];
      // Removed video ID display — go straight to fetching
      outputDiv.innerHTML = `<p style="font-size:11px; color: var(--text-muted); padding: 8px 0;">Fetching comments...</p>`;

      const comments = await fetchComments(videoId);
      if (comments.length === 0) {
        outputDiv.innerHTML += "<p>No comments found for this video.</p>";
        return;
      }

      outputDiv.innerHTML += `<p style="font-size:11px; color: var(--text-muted); padding: 4px 0;">Fetched ${comments.length} comments. Performing sentiment analysis...</p>`;
      const predictions = await getSentimentPredictions(comments);

      if (predictions) {
        const sentimentCounts = { "1": 0, "0": 0, "-1": 0 };
        const sentimentData = [];
        const totalSentimentScore = predictions.reduce((sum, item) => sum + parseInt(item.sentiment), 0);
        predictions.forEach((item) => {
          sentimentCounts[item.sentiment]++;
          sentimentData.push({
            timestamp: item.timestamp,
            sentiment: parseInt(item.sentiment)
          });
        });

        const totalComments = comments.length;
        const uniqueCommenters = new Set(comments.map(comment => comment.authorId)).size;
        const totalWords = comments.reduce((sum, comment) => sum + comment.text.split(/\s+/).filter(word => word.length > 0).length, 0);
        const avgWordLength = (totalWords / totalComments).toFixed(2);
        const avgSentimentScore = (totalSentimentScore / totalComments).toFixed(2);
        const normalizedSentimentScore = (((parseFloat(avgSentimentScore) + 1) / 2) * 10).toFixed(2);

        // Clear loading messages
        outputDiv.innerHTML = '';

        // Metrics
        outputDiv.innerHTML += `
          <div class="section">
            <div class="section-header">
              <span class="section-label">Summary</span>
              <div class="section-line"></div>
            </div>
            <div class="metrics-grid">
              <div class="metric-card info">
                <div class="metric-value">${totalComments}</div>
                <div class="metric-label">Total<br>Comments</div>
              </div>
              <div class="metric-card neutral">
                <div class="metric-value">${uniqueCommenters}</div>
                <div class="metric-label">Unique<br>Commenters</div>
              </div>
              <div class="metric-card positive">
                <div class="metric-value metric-value positive">${normalizedSentimentScore}</div>
                <div class="metric-label">Sentiment<br>Score /10</div>
              </div>
            </div>
          </div>
        `;

        // Sentiment Analysis + chart placeholder
        outputDiv.innerHTML += `
          <div class="section">
            <div class="section-header">
              <span class="section-label">Sentiment Analysis</span>
              <div class="section-line"></div>
            </div>
            <div class="sentiment-bar-wrap">
              <div class="bar-row">
                <span class="bar-label positive">Positive</span>
                <div class="bar-track"><div class="bar-fill positive" style="width:${((sentimentCounts['1']/totalComments)*100).toFixed(0)}%"></div></div>
                <span class="bar-pct">${((sentimentCounts['1']/totalComments)*100).toFixed(0)}%</span>
              </div>
              <div class="bar-row">
                <span class="bar-label neutral">Neutral</span>
                <div class="bar-track"><div class="bar-fill neutral" style="width:${((sentimentCounts['0']/totalComments)*100).toFixed(0)}%"></div></div>
                <span class="bar-pct">${((sentimentCounts['0']/totalComments)*100).toFixed(0)}%</span>
              </div>
              <div class="bar-row">
                <span class="bar-label negative">Negative</span>
                <div class="bar-track"><div class="bar-fill negative" style="width:${((sentimentCounts['-1']/totalComments)*100).toFixed(0)}%"></div></div>
                <span class="bar-pct">${((sentimentCounts['-1']/totalComments)*100).toFixed(0)}%</span>
              </div>
            </div>
            <div id="chart-container" style="margin-top:10px;"></div>
          </div>`;

        await fetchAndDisplayChart(sentimentCounts);

        // Trend graph
        outputDiv.innerHTML += `
          <div class="section">
            <div class="section-header">
              <span class="section-label">Sentiment Trend</span>
              <div class="section-line"></div>
            </div>
            <div id="trend-graph-container"></div>
          </div>`;

        await fetchAndDisplayTrendGraph(sentimentData);

        // Word cloud
        outputDiv.innerHTML += `
          <div class="section">
            <div class="section-header">
              <span class="section-label">Word Cloud</span>
              <div class="section-line"></div>
            </div>
            <div id="wordcloud-container"></div>
          </div>`;

        await fetchAndDisplayWordCloud(comments.map(comment => comment.text));

        // First 25 comments — improved design
        outputDiv.innerHTML += `
          <div class="section">
            <div class="section-header">
              <span class="section-label">First 25 Comments</span>
              <div class="section-line"></div>
            </div>
            <div class="comments-list">
              ${predictions.slice(0, 25).map((item, index) => {
                const s = parseInt(item.sentiment);
                const sentClass = s === 1 ? 'positive' : s === -1 ? 'negative' : 'neutral';
                const sentLabel = s === 1 ? 'Positive' : s === -1 ? 'Negative' : 'Neutral';
                return `
                  <div class="comment-card">
                    <div class="sentiment-strip ${sentClass}"></div>
                    <p class="comment-text">${item.comment}</p>
                    <div class="comment-meta">
                      <span class="sentiment-tag ${sentClass}">${sentLabel}</span>
                      <span class="comment-likes">#${index + 1}</span>
                    </div>
                  </div>`;
              }).join('')}
            </div>
          </div>`;
      }
    } else {
      outputDiv.innerHTML = "<p>This is not a valid YouTube URL.</p>";
    }
  });

  async function fetchComments(videoId) {
    let comments = [];
    let pageToken = "";
    try {
      while (comments.length < 500) {
        const response = await fetch(`https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=100&pageToken=${pageToken}&key=${API_KEY}`);
        const data = await response.json();
        if (data.items) {
          data.items.forEach(item => {
            const commentText = item.snippet.topLevelComment.snippet.textOriginal;
            const timestamp = item.snippet.topLevelComment.snippet.publishedAt;
            const authorId = item.snippet.topLevelComment.snippet.authorChannelId?.value || 'Unknown';
            comments.push({ text: commentText, timestamp: timestamp, authorId: authorId });
          });
        }
        pageToken = data.nextPageToken;
        if (!pageToken) break;
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
      outputDiv.innerHTML += "<p>Error fetching comments.</p>";
    }
    return comments;
  }

  async function getSentimentPredictions(comments) {
    try {
      const response = await fetch(`${API_URL}/predict_with_timestamps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comments })
      });
      const result = await response.json();
      if (response.ok) {
        return result;
      } else {
        throw new Error(result.error || 'Error fetching predictions');
      }
    } catch (error) {
      console.error("Error fetching predictions:", error);
      outputDiv.innerHTML += "<p>Error fetching sentiment predictions.</p>";
      return null;
    }
  }

  async function fetchAndDisplayChart(sentimentCounts) {
    try {
      const response = await fetch(`${API_URL}/generate_chart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentiment_counts: sentimentCounts })
      });
      if (!response.ok) throw new Error('Failed to fetch chart image');
      const blob = await response.blob();
      const imgURL = URL.createObjectURL(blob);
      const img = document.createElement('img');
      img.src = imgURL;
      img.style.cssText = 'width:100%; border-radius:8px; margin-top:8px;';
      document.getElementById('chart-container').appendChild(img);
    } catch (error) {
      console.error("Error fetching chart image:", error);
    }
  }

  async function fetchAndDisplayWordCloud(comments) {
    try {
      const response = await fetch(`${API_URL}/generate_wordcloud`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comments })
      });
      if (!response.ok) throw new Error('Failed to fetch word cloud image');
      const blob = await response.blob();
      const imgURL = URL.createObjectURL(blob);
      const img = document.createElement('img');
      img.src = imgURL;
      img.style.cssText = 'width:100%; border-radius:8px; margin-top:8px;';
      document.getElementById('wordcloud-container').appendChild(img);
    } catch (error) {
      console.error("Error fetching word cloud image:", error);
    }
  }

  async function fetchAndDisplayTrendGraph(sentimentData) {
    try {
      const response = await fetch(`${API_URL}/generate_trend_graph`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentiment_data: sentimentData })
      });
      if (!response.ok) throw new Error('Failed to fetch trend graph image');
      const blob = await response.blob();
      const imgURL = URL.createObjectURL(blob);
      const img = document.createElement('img');
      img.src = imgURL;
      img.style.cssText = 'width:100%; border-radius:8px; margin-top:8px;';
      document.getElementById('trend-graph-container').appendChild(img);
    } catch (error) {
      console.error("Error fetching trend graph image:", error);
    }
  }
});