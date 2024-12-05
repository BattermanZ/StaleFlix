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

  const contentCards = (items: StaleContent[]): string => {
    let html = '';
    for (let i = 0; i < items.length; i += 2) {
      html += '<tr>';
      for (let j = i; j < Math.min(i + 2, items.length); j++) {
        const item = items[j];
        const requesterColor = getRequesterColor(item.requester);
        html += `
          <td style="width: 50%; padding: 10px; vertical-align: top;">
            <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; border: 1px solid #e0e0e0; border-radius: 5px; overflow: hidden;">
              <tr>
                <td style="padding: 0;">
                  <img src="${item.poster_url}" alt="${item.title} Poster" style="width: 100%; max-width: 300px; height: auto; display: block;">
                </td>
              </tr>
              <tr>
                <td style="padding: 15px; text-align: center;">
                  <h4 style="font-size: 18px; font-weight: bold; margin: 0 0 5px 0;">${item.title}</h4>
                  <p style="font-size: 14px; font-style: italic; color: #666666; margin: 0 0 15px 0;">
                    ${item.original_title && item.original_title !== item.title ? item.original_title : '&nbsp;'}
                  </p>
                  <p style="font-size: 14px; color: #666666; margin: 8px 0;">Added on: ${formatDate(item.added_at)}</p>
                  <p style="font-size: 14px; color: #666666; margin: 8px 0;">
                    Requested by: 
                    <span style="display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; color: #ffffff; background-color: ${requesterColor};">
                      ${item.requester}
                    </span>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        `;
      }
      if (i + 1 >= items.length) {
        html += '<td style="width: 50%; padding: 10px;"></td>';
      }
      html += '</tr>';
    }
    return html;
  };

  const html = `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>StaleFlix Newsletter</title>
    </head>
    <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.4; margin: 0; padding: 0; background-color: #f4f4f4;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 640px; margin: 0 auto; background-color: #ffffff;">
        <tr>
          <td style="background-color: #E5A00D; color: #ffffff; text-align: center; padding: 20px;">
            <h1 style="font-size: 36px; font-weight: bold; margin: 0;">
              <span style="color: #282a2d;">Stale</span><span style="color: #ffffff;">Flix</span>
            </h1>
            <p style="margin: 10px 0 0;">Nobody likes stale content</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 20px;">
            <h2 style="font-size: 24px; font-weight: bold; margin-bottom: 20px; border-bottom: 2px solid #282a2d; padding-bottom: 10px;">What's stale in this month of ${getCurrentMonth()}</h2>
            <p>${personalizedMessage}</p>
            
            ${movies.length > 0 ? `
              <h3 style="font-size: 24px; font-weight: bold; margin-bottom: 20px; border-bottom: 2px solid #282a2d; padding-bottom: 10px;">Movies</h3>
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                ${contentCards(movies)}
              </table>
            ` : ''}
            
            ${tvShows.length > 0 ? `
              <h3 style="font-size: 24px; font-weight: bold; margin-bottom: 20px; border-bottom: 2px solid #282a2d; padding-bottom: 10px;">TV Shows</h3>
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                ${contentCards(tvShows)}
              </table>
            ` : ''}
          </td>
        </tr>
        <tr>
          <td style="background-color: #E5A00D; color: #ffffff; text-align: center; padding: 20px; font-size: 14px;">
            <p>StaleFlix/BatterCloud &copy; ${getCurrentYear()}</p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return html;
};

export const generateNewsletter = (personalizedMessage: string, selectedContent: StaleContent[]): string => {
  const html = generateHTML(personalizedMessage, selectedContent);
  return juice(html);
};

