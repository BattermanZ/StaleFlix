import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import ReactDOMServer from 'react-dom/server';
import { NewsletterPersonalization } from './NewsletterPersonalization';
import { NewsletterTemplate } from './NewsletterTemplate';

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

interface CachedData {
  timestamp: string;
  content: StaleContent[];
}

function App() {
  const [staleContent, setStaleContent] = useState<StaleContent[]>([]);
  const [selectedItems, setSelectedItems] = useState<{[key: string]: boolean}>({});
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof StaleContent; direction: 'ascending' | 'descending' } | null>(null);
  const [isPushing, setIsPushing] = useState(false);
  const [totalSpaceSaved, setTotalSpaceSaved] = useState<number>(0);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [showPersonalization, setShowPersonalization] = useState(false);
  const [personalizedMessage, setPersonalizedMessage] = useState('');

  useEffect(() => {
    fetchStaleContent(false);
  }, []);

  useEffect(() => {
    calculateTotalSpaceSaved();
  }, [selectedItems, staleContent]);

  const fetchStaleContent = async (forceRefresh: boolean = false) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/get_stale_content?force_refresh=${forceRefresh}`);
      const data: CachedData = await response.json();
      setStaleContent(data.content);
      setLastUpdated(data.timestamp);
    } catch (error) {
      console.error('Error fetching stale content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSelectedItems: {[key: string]: boolean} = {};
    staleContent.forEach(item => {
      newSelectedItems[item.plex_id] = event.target.checked;
    });
    setSelectedItems(newSelectedItems);
  };

  const handleItemSelect = (plex_id: string) => {
    setSelectedItems(prev => ({
      ...prev,
      [plex_id]: !prev[plex_id]
    }));
  };

  const handleSort = (key: keyof StaleContent) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedContent = React.useMemo(() => {
    let sortableItems = [...staleContent];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [staleContent, sortConfig]);

  const getRequesterColor = (requester: string) => {
    const hash = requester.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    return `hsl(${hash % 360}, 70%, 80%)`;
  };

  const calculateTotalSpaceSaved = () => {
    const totalSpace = staleContent
      .filter(item => selectedItems[item.plex_id])
      .reduce((total, item) => {
        const size = parseFloat(item.size);
        return isNaN(size) ? total : total + size;
      }, 0);
    setTotalSpaceSaved(totalSpace);
  };

  const pushSelectedToN8n = async () => {
    const selectedIds = Object.keys(selectedItems).filter(id => selectedItems[id]);
    const selectedContent = staleContent
      .filter(item => selectedIds.includes(item.plex_id))
      .map(({ plex_id, title, original_title, type, added_at, requester, size, watch_status, total_episodes, requester_watched, poster_url, content_url }) => ({
        plex_id,
        title,
        original_title,
        type,
        added_at,
        requester,
        size,
        watch_status,
        total_episodes,
        requester_watched,
        poster_url,
        content_url
      }));

    setIsPushing(true);
    setUploadProgress({});

    try {
      const response = await fetch('/push_to_n8n', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ selected_content: selectedContent }),
      });
      const result = await response.json();
      alert(result.message);
    } catch (error) {
      console.error('Error pushing to n8n:', error);
      alert('Failed to push data to n8n. Please try again.');
    } finally {
      setIsPushing(false);
      setUploadProgress({});
    }
  };

  const handleNextClick = () => {
    setShowPersonalization(true);
  };

  const handleBackClick = () => {
    setShowPersonalization(false);
  };

  const handlePreviewNewsletter = () => {
    const selectedContent = staleContent.filter(item => selectedItems[item.plex_id]);
    const htmlContent = ReactDOMServer.renderToString(
      <NewsletterTemplate
        personalizedMessage={personalizedMessage}
        selectedContent={selectedContent}
      />
    );
    
    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      previewWindow.document.write(htmlContent);
      previewWindow.document.close();
    }
  };

  const handleGenerateNewsletter = () => {
    const selectedContent = staleContent.filter(item => selectedItems[item.plex_id]);
    const htmlContent = ReactDOMServer.renderToString(
      <NewsletterTemplate
        personalizedMessage={personalizedMessage}
        selectedContent={selectedContent}
      />
    );

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'staleflix_newsletter.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="staleflix-container">
      <h1 className="staleflix-header">StaleFlix</h1>
      {!showPersonalization ? (
        <>
          <button 
            onClick={() => fetchStaleContent(true)} 
            className="btn staleflix-button btn-lg mb-4"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Loading...
              </>
            ) : 'Fetch Stale Content'}
          </button>

          {lastUpdated && (
            <div className="alert alert-info" role="alert">
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </div>
          )}

          {isLoading && (
            <div className="alert alert-info" role="alert">
              <div className="d-flex align-items-center">
                <div className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
                Loading stale content...
              </div>
            </div>
          )}

          {!isLoading && staleContent.length === 0 && (
            <div className="alert alert-warning" role="alert">
              No stale content found. Click the button above to fetch stale content.
            </div>
          )}

          {!isLoading && staleContent.length > 0 && (
            <div className="staleflix-table">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th style={{width: '40px'}}>
                        <div className="form-check">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            onChange={handleSelectAll}
                            checked={Object.values(selectedItems).every(Boolean) && staleContent.length > 0}
                          />
                        </div>
                      </th>
                      <th style={{width: '100px'}}>Poster</th>
                      <th onClick={() => handleSort('title')}>Title {sortConfig?.key === 'title' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}</th>
                      <th onClick={() => handleSort('type')} style={{width: '100px'}}>Type {sortConfig?.key === 'type' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}</th>
                      <th onClick={() => handleSort('added_at')} style={{width: '120px'}}>Added Date {sortConfig?.key === 'added_at' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}</th>
                      <th onClick={() => handleSort('requester')} style={{width: '120px'}}>Requester {sortConfig?.key === 'requester' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}</th>
                      <th onClick={() => handleSort('size')} style={{width: '100px'}}>Size {sortConfig?.key === 'size' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}</th>
                      <th style={{width: '200px'}}>Watch Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedContent.map(item => (
                      <tr key={item.plex_id}>
                        <td>
                          <div className="form-check">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={selectedItems[item.plex_id] || false}
                              onChange={() => handleItemSelect(item.plex_id)}
                            />
                          </div>
                        </td>
                        <td>
                          <img src={item.poster_url} alt={`Poster for ${item.title}`} className="img-thumbnail" style={{maxWidth: '75px'}} />
                          {uploadProgress[item.plex_id] !== undefined && (
                            <div className="progress mt-1" style={{height: '5px'}}>
                              <div 
                                className="progress-bar" 
                                role="progressbar" 
                                style={{width: `${uploadProgress[item.plex_id]}%`}} 
                                aria-valuenow={uploadProgress[item.plex_id]} 
                                aria-valuemin={0} 
                                aria-valuemax={100}
                              ></div>
                            </div>
                          )}
                        </td>
                        <td>
                          {item.title}
                          {item.original_title && item.original_title !== item.title && ` [${item.original_title}]`}
                        </td>
                        <td>
                          <span className={`badge ${item.type === 'movie' ? 'bg-secondary' : 'bg-primary'}`}>
                            {item.type}
                          </span>
                        </td>
                        <td>{item.added_at}</td>
                        <td>
                          <span 
                            className="badge" 
                            style={{backgroundColor: getRequesterColor(item.requester)}}
                          >
                            {item.requester} {item.requester_watched && '☑'}
                          </span>
                        </td>
                        <td>
                          {item.size === "Unknown" ? (
                            <span className="badge bg-warning text-dark">Unknown</span>
                          ) : (
                            <span className="badge bg-info text-dark">{item.size} GB</span>
                          )}
                        </td>
                        <td>
                          {Object.entries(item.watch_status).map(([user, status]) => (
                            <div key={user}>
                              {user}: {status}
                            </div>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-3 d-flex justify-content-between align-items-center">
                <div>
                  <strong>Total Space Saved: </strong>
                  <span className="badge bg-success">{totalSpaceSaved.toFixed(2)} GB</span>
                </div>
                <div>
                  <button 
                    onClick={pushSelectedToN8n} 
                    className="btn staleflix-submit-button me-2"
                    disabled={isPushing || Object.values(selectedItems).filter(Boolean).length === 0}
                  >
                    {isPushing ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Pushing to n8n...
                      </>
                    ) : 'Push Selected to n8n'}
                  </button>
                  <button 
                    onClick={handleNextClick}
                    className="btn btn-primary"
                    disabled={Object.values(selectedItems).filter(Boolean).length === 0}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <NewsletterPersonalization
          personalizedMessage={personalizedMessage}
          setPersonalizedMessage={setPersonalizedMessage}
          onPreview={handlePreviewNewsletter}
          onGenerate={handleGenerateNewsletter}
          onBack={handleBackClick}
        />
      )}
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));