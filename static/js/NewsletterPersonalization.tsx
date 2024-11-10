import React from 'react';

interface NewsletterPersonalizationProps {
  personalizedMessage: string;
  setPersonalizedMessage: (message: string) => void;
  onPreview: () => void;
  onGenerate: () => void;
  onBack: () => void;
}

export function NewsletterPersonalization({
  personalizedMessage,
  setPersonalizedMessage,
  onPreview,
  onGenerate,
  onBack
}: NewsletterPersonalizationProps) {
  return (
    <div className="newsletter-personalization">
      <h2>Personalize Your Newsletter</h2>
      <textarea
        value={personalizedMessage}
        onChange={(e) => setPersonalizedMessage(e.target.value)
        }
        placeholder="Enter your personalized message for the newsletter..."
        rows={5}
        className="form-control mb-3"
      />
      <div className="button-group">
        <button onClick={onBack} className="btn btn-secondary me-2">Back</button>
        <button onClick={onPreview} className="btn btn-primary me-2">Preview Newsletter</button>
        <button onClick={onGenerate} className="btn btn-success">Generate Newsletter</button>
      </div>
    </div>
  );
}