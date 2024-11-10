import React, { useMemo } from 'react';

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

interface NewsletterTemplateProps {
  personalizedMessage: string;
  selectedContent: StaleContent[];
}

const colorPalette = [
  '#E5A00C', '#8BA023', '#39924F', '#007D6C', '#006370', '#2F4858',
  '#E5A00C', '#504538', '#B6A99A', '#00CDB2', '#00947D'
];

const getRequesterColor = (requester: string) => {
  const hash = requester.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  return colorPalette[Math.abs(hash) % colorPalette.length];
};

const getCurrentMonth = () => {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return months[new Date().getMonth()];
};

const getCurrentYear = () => {
  return new Date().getFullYear();
};

export const NewsletterTemplate: React.FC<NewsletterTemplateProps> = ({ personalizedMessage, selectedContent }) => {
  const movies = selectedContent.filter(item => item.type === 'movie');
  const tvShows = selectedContent.filter(item => item.type === 'show');

  const requesterColors = useMemo(() => {
    const colors: { [key: string]: string } = {};
    selectedContent.forEach(item => {
      if (!colors[item.requester]) {
        colors[item.requester] = getRequesterColor(item.requester);
      }
    });
    return colors;
  }, [selectedContent]);

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>StaleFlix Newsletter</title>
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --md-sys-color-primary: #E5A00D;
            --md-sys-color-on-primary: #ffffff;
            --md-sys-color-primary-container: #FFEAC2;
            --md-sys-color-on-primary-container: #2C1E00;
            --md-sys-color-secondary: #6F5B40;
            --md-sys-color-on-secondary: #ffffff;
            --md-sys-color-secondary-container: #FBDEBB;
            --md-sys-color-on-secondary-container: #261900;
            --md-sys-color-tertiary: #516440;
            --md-sys-color-on-tertiary: #ffffff;
            --md-sys-color-tertiary-container: #D3EABC;
            --md-sys-color-on-tertiary-container: #102004;
            --md-sys-color-error: #ba1a1a;
            --md-sys-color-on-error: #ffffff;
            --md-sys-color-error-container: #ffdad6;
            --md-sys-color-on-error-container: #410002;
            --md-sys-color-background: #FFFBFF;
            --md-sys-color-on-background: #1F1B16;
            --md-sys-color-surface: #FFFBFF;
            --md-sys-color-on-surface: #1F1B16;
            --md-sys-color-surface-variant: #EEE0CF;
            --md-sys-color-on-surface-variant: #4E4539;
            --md-sys-color-outline: #807567;
            --md-sys-color-outline-variant: #D1C5B4;
            --md-sys-color-accent: #1E88E5;

            --md-sys-typescale-display-large-font-family-name: Roboto;
            --md-sys-typescale-display-large-font-weight: 400;
            --md-sys-typescale-display-large-font-size: 57px;
            --md-sys-typescale-display-large-line-height: 64px;
            --md-sys-typescale-display-large-letter-spacing: -0.25px;
            
            --md-sys-typescale-headline-medium-font-family-name: Roboto;
            --md-sys-typescale-headline-medium-font-weight: 400;
            --md-sys-typescale-headline-medium-font-size: 28px;
            --md-sys-typescale-headline-medium-line-height: 36px;
            
            --md-sys-typescale-title-large-font-family-name: Roboto;
            --md-sys-typescale-title-large-font-weight: 400;
            --md-sys-typescale-title-large-font-size: 22px;
            --md-sys-typescale-title-large-line-height: 28px;
            
            --md-sys-typescale-body-large-font-family-name: Roboto;
            --md-sys-typescale-body-large-font-weight: 400;
            --md-sys-typescale-body-large-font-size: 16px;
            --md-sys-typescale-body-large-line-height: 24px;
            --md-sys-typescale-body-large-letter-spacing: 0.5px;
            
            --md-sys-typescale-body-medium-font-family-name: Roboto;
            --md-sys-typescale-body-medium-font-weight: 400;
            --md-sys-typescale-body-medium-font-size: 14px;
            --md-sys-typescale-body-medium-line-height: 20px;
            --md-sys-typescale-body-medium-letter-spacing: 0.25px;
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }

          body {
            font-family: var(--md-sys-typescale-body-large-font-family-name), sans-serif;
            line-height: var(--md-sys-typescale-body-large-line-height);
            font-size: var(--md-sys-typescale-body-large-font-size);
            letter-spacing: var(--md-sys-typescale-body-large-letter-spacing);
            color: var(--md-sys-color-on-background);
            margin: 0;
            padding: 0;
            background-color: var(--md-sys-color-background);
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
          }
          header {
            background-color: var(--md-sys-color-primary);
            color: var(--md-sys-color-on-primary);
            text-align: center;
            padding: 40px 0;
            border-radius: 0 0 10px 10px;
          }
          .logo-container {
            display: inline-block;
            margin-bottom: 10px;
          }
          .logo-text {
            font-size: 48px;
            font-weight: bold;
            letter-spacing: -1px;
            text-transform: uppercase;
          }
          .stale {
            color: #282a2d;
          }
          .flix {
            color: #e5a00d;
          }
          .material-shadow {
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            padding: 10px 20px;
            border-radius: 4px;
            background-color: white;
          }
          .subheader {
            font-size: var(--md-sys-typescale-headline-medium-font-size);
            line-height: var(--md-sys-typescale-headline-medium-line-height);
            font-weight: var(--md-sys-typescale-headline-medium-font-weight);
            font-style: italic;
            margin-top: 10px;
          }
          .intro {
            background-color: var(--md-sys-color-surface);
            padding: 20px;
            margin: 20px 0;
            border-radius: 15px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            color: var(--md-sys-color-on-surface);
            animation: fadeIn 0.5s ease-out;
          }
          .section-title {
            font-family: var(--md-sys-typescale-headline-medium-font-family-name), sans-serif;
            font-size: var(--md-sys-typescale-headline-medium-font-size);
            line-height: var(--md-sys-typescale-headline-medium-line-height);
            font-weight: var(--md-sys-typescale-headline-medium-font-weight);
            border-bottom: 4px solid #282a2d;
            padding-bottom: 10px;
            margin-top: 40px;
            color: #282a2d;
          }
          .card-grid {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 20px;
            margin-top: 20px;
          }
          .card {
            background-color: var(--md-sys-color-surface);
            border-radius: 15px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            overflow: hidden;
            transition: transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out;
            width: 100%;
            max-width: 300px;
            color: var(--md-sys-color-on-surface);
            animation: fadeIn 0.5s ease-out;
            display: flex;
            flex-direction: column;
          }
          .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
          }
          .card-image-container {
            width: 100%;
            padding-top: 150%; /* 2:3 aspect ratio */
            position: relative;
            overflow: hidden;
          }
          .card-image {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center;
            transition: transform 0.3s ease-in-out;
          }
          .card:hover .card-image {
            transform: scale(1.05);
          }
          .card-content {
            padding: 20px;
            display: flex;
            flex-direction: column;
            flex-grow: 1;
          }
          .card-title {
            font-size: var(--md-sys-typescale-title-large-font-size);
            line-height: var(--md-sys-typescale-title-large-line-height);
            font-weight: var(--md-sys-typescale-title-large-font-weight);
            margin: 0 0 10px 0;
            color: var(--md-sys-color-on-surface);
            text-align: center;
          }
          .card-original-title {
            font-size: var(--md-sys-typescale-body-medium-font-size);
            line-height: var(--md-sys-typescale-body-medium-line-height);
            letter-spacing: var(--md-sys-typescale-body-medium-letter-spacing);
            color: var(--md-sys-color-on-surface-variant);
            font-style: italic;
            margin: 0 0 20px 0;
            text-align: center;
          }
          .card-info-container {
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            flex-grow: 1;
          }
          .card-info {
            font-size: var(--md-sys-typescale-body-medium-font-size);
            line-height: var(--md-sys-typescale-body-medium-line-height);
            letter-spacing: var(--md-sys-typescale-body-medium-letter-spacing);
            color: var(--md-sys-color-on-surface-variant);
            margin: 8px 0;
            display: flex;
            align-items: center;
          }
          .card-info i {
            width: 20px;
            margin-right: 8px;
            color: var(--md-sys-color-primary);
          }
          .requester-info {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 12px;
          }
          .requester-prefix {
            margin-right: 8px;
          }
          .requester-tag {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
            color: white;
          }
          footer {
            background-color: #E5A00D;
            color: #ffffff;
            padding: 20px;
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .plex-logo-container {
            background-color: white;
            padding: 10px;
            border-radius: 4px;
            width: 120px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .plex-logo {
            width: 100%;
            height: auto;
            object-fit: contain;
          }
          .copyright {
            font-size: 18px;
            font-weight: 500;
            margin: 0;
            padding: 0;
          }
          @media (min-width: 768px) {
            .card {
              width: calc(50% - 20px);
            }
          }
          @media (min-width: 1024px) {
            .card {
              width: calc(25% - 20px);
            }
          }
        ` }} />
      </head>
      <body>
        <header>
          <div className="logo-container material-shadow">
            <div className="logo-text">
              <span className="stale">Stale</span><span className="flix">Flix</span>
            </div>
          </div>
          <div className="subheader">Nobody likes stale content</div>
        </header>
        
        <div className="container">
          <section className="intro">
            <h2 className="section-title">What's stale in this month of {getCurrentMonth()}</h2>
            <p>{personalizedMessage}</p>
          </section>
          
          {movies.length > 0 && (
            <section>
              <h2 className="section-title">Movies</h2>
              <div className="card-grid">
                {movies.map((movie) => (
                  <div className="card" key={movie.plex_id}>
                    <div className="card-image-container">
                      <img 
                        src={movie.poster_url} 
                        alt={`${movie.title} poster`}
                        className="card-image"
                      />
                    </div>
                    <div className="card-content">
                      <h3 className="card-title">{movie.title}</h3>
                      {movie.original_title !== movie.title && (
                        <p className="card-original-title">({movie.original_title})</p>
                      )}
                      <div className="card-info-container">
                        <p className="card-info"><i className="fas fa-film"></i> <span>Movie</span></p>
                        <p className="card-info"><i className="fas fa-calendar"></i> <span>Added on: {movie.added_at}</span></p>
                        <div className="requester-info">
                          <span className="requester-prefix">Requested by</span>
                          <span 
                            className="requester-tag" 
                            style={{ backgroundColor: requesterColors[movie.requester] }}
                          >
                            {movie.requester}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          
          {tvShows.length > 0 && (
            <section>
              <h2 className="section-title">TV Shows</h2>
              <div className="card-grid">
                {tvShows.map((show) => (
                  <div className="card" key={show.plex_id}>
                    <div className="card-image-container">
                      <img 
                        src={show.poster_url} 
                        alt={`${show.title} poster`}
                        className="card-image"
                      />
                    </div>
                    <div className="card-content">
                      <h3 className="card-title">{show.title}</h3>
                      {show.original_title !== show.title && (
                        <p className="card-original-title">({show.original_title})</p>
                      )}
                      <div className="card-info-container">
                        <p className="card-info"><i className="fas fa-tv"></i> <span>TV Show</span></p>
                        <p className="card-info"><i className="fas fa-calendar"></i> <span>Added on: {show.added_at}</span></p>
                        <div className="requester-info">
                          <span className="requester-prefix">Requested by</span>
                          <span 
                            className="requester-tag" 
                            style={{ backgroundColor: requesterColors[show.requester] }}
                          >
                            {show.requester}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
        
        <footer>
          <div className="plex-logo-container">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Plex_logo_2022.svg/320px-Plex_logo_2022.svg.png" alt="Plex Logo" className="plex-logo" />
          </div>
          <p className="copyright">StaleFlix/BatterCloud © {getCurrentYear()}</p>
        </footer>
      </body>
    </html>
  );
};