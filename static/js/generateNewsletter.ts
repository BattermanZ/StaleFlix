import juice from 'juice';

interface StaleContent {
  plex_id: string;
  title: string;
  original_title: string;
  type: string;
  added_at: string;
  requester: string;
  size: string;
  watch_status: { [key: string]: string };
  total_episodes?: number;
  requester_watched: boolean;
  poster_url: string;
  content_url: string;
}

const getCurrentMonth = (): string => {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return months[new Date().getMonth()];
};

const getCurrentYear = (): number => {
  return new Date().getFullYear();
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
};

const getRequesterColor = (requester: string): string => {
  const hash = requester.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  return `hsl(${hash % 360}, 70%, 80%)`;
};

const generateHTML = (personalizedMessage: string, selectedContent: StaleContent[]): string => {
  const movies = selectedContent.filter(item => item.type === 'movie');
  const tvShows = selectedContent.filter(item => item.type === 'show');

  const styles = `
    /* Reset styles */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
    }
    /* Basic styles */
    body {
      font-family: Arial, sans-serif;
      font-size: 16px;
      line-height: 1.4;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background-color: #E5A00D;
      color: #ffffff;
      text-align: center;
      padding: 20px;
    }
    .logo {
      font-size: 36px;
      font-weight: bold;
    }
    .stale {
      color: #282a2d;
    }
    .flix {
      color: #ffffff;
    }
    .content {
      padding: 20px;
    }
    .section-title {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 20px;
      border-bottom: 2px solid #282a2d;
      padding-bottom: 10px;
    }
    .card-row {
      display: table;
      width: 100%;
      table-layout: fixed;
    }
    .card-cell {
      display: table-cell;
      width: 50%;
      padding: 10px;
      vertical-align: top;
    }
    .card {
      border: 1px solid #e0e0e0;
      border-radius: 5px;
      overflow: hidden;
      height: 100%;
    }
    .card-image-container {
      width: 100%;
      padding-top: 150%; /* 2:3 aspect ratio */
      position: relative;
      overflow: hidden;
      background-color: #f8f9fa;
    }
    .card-image {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .card-content {
      padding: 15px;
      text-align: center;
    }
    .card-title {
      font-size: 18px;
      font-weight: bold;
      margin: 0 0 5px 0;
      text-align: center;
    }
    .card-original-title {
      font-size: 14px;
      font-style: italic;
      color: #666666;
      margin: 0 0 15px 0;
      text-align: center;
      min-height: 1.5em; /* Ensures consistent height */
    }
    .card-info {
      font-size: 14px;
      color: #666666;
      margin: 8px 0;
      text-align: center;
    }
    .requester-tag {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
      color: #ffffff;
    }
    .footer {
      background-color: #E5A00D;
      color: #ffffff;
      text-align: center;
      padding: 20px;
      font-size: 14px;
    }
  `;

  const contentCards = (items: StaleContent[]): string => {
    let html = '';
    for (let i = 0; i < items.length; i += 2) {
      html += '<div class="card-row">';
      for (let j = i; j < Math.min(i + 2, items.length); j++) {
        const item = items[j];
        const requesterColor = getRequesterColor(item.requester);
        html += `
          <div class="card-cell">
            <div class="card">
              <div class="card-image-container">
                <img src="${item.poster_url}" alt="${item.title} Poster" class="card-image">
              </div>
              <div class="card-content">
                <h4 class="card-title">${item.title}</h4>
                <p class="card-original-title">
                  ${item.original_title && item.original_title !== item.title ? item.original_title : '&nbsp;'}
                </p>
                <p class="card-info">Added on: ${formatDate(item.added_at)}</p>
                <p class="card-info">
                  Requested by: 
                  <span class="requester-tag" style="background-color: ${requesterColor};">
                    ${item.requester}
                  </span>
                </p>
              </div>
            </div>
          </div>
        `;
      }
      if (i + 1 >= items.length) {
        html += '<div class="card-cell"></div>';
      }
      html += '</div>';
    }
    return html;
  };

  const html = `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>StaleFlix Newsletter</title>
      <style type="text/css">${styles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">
            <span class="stale">Stale</span><span class="flix">Flix</span>
          </div>
          <div>Nobody likes stale content</div>
        </div>
        <div class="content">
          <h2 class="section-title">What's stale in this month of ${getCurrentMonth()}</h2>
          <p>${personalizedMessage}</p>
          
          ${movies.length > 0 ? `
            <h3 class="section-title">Movies</h3>
            ${contentCards(movies)}
          ` : ''}
          
          ${tvShows.length > 0 ? `
            <h3 class="section-title">TV Shows</h3>
            ${contentCards(tvShows)}
          ` : ''}
        </div>
        <div class="footer">
          <p>StaleFlix/BatterCloud &copy; ${getCurrentYear()}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return html;
};

export const generateNewsletter = (personalizedMessage: string, selectedContent: StaleContent[]): string => {
  const html = generateHTML(personalizedMessage, selectedContent);
  return juice(html);
};

