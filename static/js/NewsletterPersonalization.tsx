import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { format } from 'date-fns';

interface NewsletterPersonalizationProps {
  personalizedMessage: string;
  setPersonalizedMessage: (message: string) => void;
  onPreview: () => void;
  onGenerate: () => void;
  onBack: () => void;
  onSendToListmonk: (cloudinaryFolder: string) => Promise<void>;
  onSendToPlex: (cloudinaryFolder: string) => Promise<void>;
  selectedContent: any[];
}

const getCloudinaryFolder = () => {
  return `staleflix/${format(new Date(), 'yyyy-MM')}`;
};

export function NewsletterPersonalization({
  personalizedMessage,
  setPersonalizedMessage,
  onPreview,
  onGenerate,
  onBack,
  onSendToListmonk,
  onSendToPlex,
  selectedContent
}: NewsletterPersonalizationProps) {
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSendToListmonk = async () => {
    setIsSending(true);
    setSendResult(null);
    try {
      const cloudinaryFolder = getCloudinaryFolder();
      await onSendToListmonk(cloudinaryFolder);
      setSendResult({ success: true, message: "Newsletter sent to Listmonk successfully!" });
    } catch (error) {
      setSendResult({ success: false, message: "Failed to send newsletter to Listmonk. Please try again." });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendToPlex = async () => {
    setIsSending(true);
    setSendResult(null);
    try {
      const cloudinaryFolder = getCloudinaryFolder();
      await onSendToPlex(cloudinaryFolder);
      setSendResult({ success: true, message: "Content sent to Plex collections successfully!" });
    } catch (error) {
      setSendResult({ success: false, message: "Failed to send content to Plex collections. Please try again." });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="newsletter-personalization">
      <h2 className="staleflix-header mb-4">Personalize Your Newsletter</h2>
      <div className="mb-4">
        <ReactQuill
          value={personalizedMessage}
          onChange={setPersonalizedMessage}
          placeholder="Enter your personalized message for the newsletter..."
          modules={{
            toolbar: [
              [{ 'header': [1, 2, 3, false] }],
              ['bold', 'italic', 'underline', 'strike'],
              [{'list': 'ordered'}, {'list': 'bullet'}],
              ['link', 'image'],
              ['clean']
            ],
          }}
          className="bg-white"
        />
      </div>
      <div className="button-group mt-3 d-flex justify-content-between align-items-center">
        <div>
          <button onClick={onBack} className="btn btn-secondary">Back</button>
        </div>
        <div className="d-flex gap-2">
          <button onClick={onPreview} className="btn btn-primary">Preview Newsletter</button>
          <button onClick={onGenerate} className="btn btn-success">Generate Newsletter</button>
        </div>
        <div className="d-flex gap-2">
          <button 
            onClick={handleSendToListmonk} 
            className="btn btn-info"
            disabled={isSending}
          >
            {isSending ? 'Sending...' : 'Send to Listmonk'}
          </button>
          <button 
            onClick={handleSendToPlex} 
            className="btn btn-warning"
            disabled={isSending || selectedContent.length === 0}
          >
            {isSending ? 'Sending...' : 'Send to Plex'}
          </button>
        </div>
      </div>
      {sendResult && (
        <div className={`alert ${sendResult.success ? 'alert-success' : 'alert-danger'} mt-3`} role="alert">
          {sendResult.message}
        </div>
      )}
    </div>
  );
}

