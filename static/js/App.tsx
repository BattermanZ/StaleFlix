import React, { useState } from 'react';
import ReactDOM from 'react-dom';

interface StaleContent {
  title: string;
  type: string;
  added_at: string;
  requester: string;
  size: string;
}

function App() {
  const [staleContent, setStaleContent] = useState<StaleContent[]>([]);
  const [selectedItems, setSelectedItems] = useState<{[key: string]: boolean}>({});
  const [isLoading, setIsLoading] = useState(false);

  const fetchStaleContent = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/get_stale_content');
      const data = await response.json();
      setStaleContent(data);
    } catch (error) {
      console.error('Error fetching stale content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSelectedItems: {[key: string]: boolean} = {};
    staleContent.forEach(item => {
      newSelectedItems[item.title] = event.target.checked;
    });
    setSelectedItems(newSelectedItems);
  };

  const handleItemSelect = (title: string) => {
    setSelectedItems(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const handleSubmit = async () => {
    const selectedTitles = Object.keys(selectedItems).filter(title => selectedItems[title]);
    try {
      const response = await fetch('/submit_selection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ selected_items: selectedTitles }),
      });
      const result = await response.json();
      alert(result.message);
    } catch (error) {
      console.error('Error submitting selection:', error);
      alert('Failed to submit selection. Please try again.');
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Stale Content Selector</h1>
      <button 
        onClick={fetchStaleContent} 
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        disabled={isLoading}
      >
        {isLoading ? 'Loading...' : 'Fetch Stale Content'}
      </button>
      {isLoading && <p>Loading stale content...</p>}
      {!isLoading && staleContent.length === 0 && <p>No stale content found. Click the button above to fetch stale content.</p>}
      {!isLoading && staleContent.length > 0 && (
        <>
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border-b p-2">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={Object.values(selectedItems).every(Boolean) && staleContent.length > 0}
                  />
                </th>
                <th className="border-b p-2">Title</th>
                <th className="border-b p-2">Type</th>
                <th className="border-b p-2">Added Date</th>
                <th className="border-b p-2">Requester</th>
                <th className="border-b p-2">Size</th>
              </tr>
            </thead>
            <tbody>
              {staleContent.map(item => (
                <tr key={item.title} className="hover:bg-gray-50">
                  <td className="border-b p-2">
                    <input
                      type="checkbox"
                      checked={selectedItems[item.title] || false}
                      onChange={() => handleItemSelect(item.title)}
                    />
                  </td>
                  <td className="border-b p-2">{item.title}</td>
                  <td className="border-b p-2">{item.type}</td>
                  <td className="border-b p-2">{item.added_at}</td>
                  <td className="border-b p-2">{item.requester}</td>
                  <td className="border-b p-2">{item.size}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button 
            onClick={handleSubmit} 
            className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Submit Selection
          </button>
        </>
      )}
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));