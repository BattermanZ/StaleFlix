import React, { useState } from 'react';

interface NewsletterPersonalizationProps {
  personalizedMessage: string;
  setPersonalizedMessage: (message: string) => void;
  onPreview: () => void;
  onGenerate: () => void;
  onBack: () => void;
  onSendToListmonk: () => Promise<void>;
}

export function NewsletterPersonalization({
  personalizedMessage,
  setPersonalizedMessage,
  onPreview,
  onGenerate,
  onBack,
  onSendToListmonk
}: NewsletterPersonalizationProps) {
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSendToListmonk = async () => {
    setIsSending(true);
    setSendResult(null);
    try {
      await onSendToListmonk();
      setSendResult({ success: true, message: "Newsletter sent to Listmonk successfully!" });
    } catch (error) {
      setSendResult({ success: false, message: "Failed to send newsletter to Listmonk. Please try again." });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="newsletter-personalization">
      <h2>Personalize Your Newsletter</h2>
      <textarea
        value={personalizedMessage}
        onChange={(e) => setPersonalizedMessage(e.target.value)}
        placeholder="Enter your personalized message for the newsletter..."
        rows={5}
        className="form-control mb-3"
      />
      <div className="button-group">
        <button onClick={onBack} className="btn btn-secondary me-2">Back</button>
        <button onClick={onPreview} className="btn btn-primary me-2">Preview Newsletter</button>
        <button onClick={onGenerate} className="btn btn-success me-2">Generate Newsletter</button>
        <button 
          onClick={handleSendToListmonk} 
          className="btn btn-info"
          disabled={isSending}
        >
          {isSending ? 'Sending...' : 'Send to Listmonk'}
        </button>
      </div>
      {sendResult && (
        <div className={`alert ${sendResult.success ? 'alert-success' : 'alert-danger'} mt-3`} role="alert">
          {sendResult.message}
        </div>
      )}
    </div>
  );
}

