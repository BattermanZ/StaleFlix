import React, { useState } from 'react';
import ReactDOM from 'react-dom';

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

  const fetchStaleContent = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/get_stale_content?force_refresh=true');
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

  const handleSubmit = async () => {
    const selectedIds = Object.keys(selectedItems).filter(id => selectedItems[id]);
    try {
      const response = await fetch('/submit_selection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ selected_items: selectedIds }),
      });
      const result = await response.json();
      alert(result.message);
    } catch (error) {
      console.error('Error submitting selection:', error);
      alert('Failed to submit selection. Please try again.');
    }
  };

  return (
    <div className="staleflix-container">
      <h1 className="staleflix-header">StaleFlix</h1>
      <button 
        onClick={fetchStaleContent} 
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
                  <th>Title</th>
                  <th style={{width: '100px'}}>Type</th>
                  <th style={{width: '120px'}}>Added Date</th>
                  <th style={{width: '120px'}}>Requester</th>
                  <th style={{width: '100px'}}>Size</th>
                  <th style={{width: '200px'}}>Watch Status</th>
                </tr>
              </thead>
              <tbody>
                {staleContent.map(item => (
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
                    <td>{item.title || item.original_title}</td>
                    <td><span className="badge bg-secondary">{item.type}</span></td>
                    <td>{item.added_at}</td>
                    <td>
                      {item.requester === "Unknown" ? (
                        <span className="badge bg-warning text-dark">Unknown</span>
                      ) : (
                        item.requester
                      )}
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
          <div className="p-3">
            <button 
              onClick={handleSubmit} 
              className="btn staleflix-submit-button"
            >
              Submit Selection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));