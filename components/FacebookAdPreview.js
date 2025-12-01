import { X, Copy, Download, Facebook } from "lucide-react";
import { toast } from "sonner";

function FacebookAdPreview({ property, adCopy, onClose }) {
  const copyToClipboard = async (text, label) => {
    try {
      // Try modern Clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard!`);
      } else {
        // Fallback method
        fallbackCopyToClipboard(text);
        toast.success(`${label} copied to clipboard!`);
      }
    } catch (err) {
      // If Clipboard API fails, use fallback
      try {
        fallbackCopyToClipboard(text);
        toast.success(`${label} copied to clipboard!`);
      } catch (fallbackErr) {
        console.error('Failed to copy:', fallbackErr);
        toast.error("Failed to copy. Please copy manually.");
      }
    }
  };

  const fallbackCopyToClipboard = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      textArea.remove();
    } catch (err) {
      textArea.remove();
      throw err;
    }
  };

  const copyAllContent = async () => {
    const fullContent = `
Facebook Ad Content for ${property.location}

HEADLINE: ${adCopy.headline}

PRIMARY TEXT: ${adCopy.primary_text}

DESCRIPTION: ${adCopy.description}

CALL TO ACTION: ${adCopy.call_to_action}

---
Property Details:
- Location: ${property.location}
- Bedrooms: ${property.beds}
- Bathrooms: ${property.baths}
- Car Parks: ${property.carpark}
${property.price ? `- Price: $${property.price.toLocaleString()}` : ''}
${property.size ? `- Size: ${property.size} sqm` : ''}
    `.trim();
    
    await copyToClipboard(fullContent, "Full ad content");
  };

  return (
    <div className="modal-overlay" data-testid="facebook-ad-modal">
      <div className="modal-content facebook-ad-modal">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Facebook className="text-blue-600" size={28} />
            <h2 className="modal-title">Facebook Ad Preview</h2>
          </div>
          <button onClick={onClose} className="modal-close-btn" data-testid="close-modal-btn">
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <div className="fb-ad-preview-container">
            {/* Facebook Ad Preview */}
            <div className="fb-ad-preview">
              <div className="fb-ad-header">
                <div className="fb-ad-profile">
                  <div className="fb-ad-avatar">
                    <Facebook size={20} className="text-white" />
                  </div>
                  <div>
                    <div className="fb-ad-page-name">Your Real Estate Page</div>
                    <div className="fb-ad-sponsored">Sponsored</div>
                  </div>
                </div>
              </div>

              <div className="fb-ad-text" data-testid="fb-ad-primary-text">
                {adCopy.primary_text}
              </div>

              {property.images && property.images.length > 0 && (
                <div className="fb-ad-image">
                  <img src={property.images[0]} alt="Property" />
                </div>
              )}

              <div className="fb-ad-details">
                <div className="fb-ad-headline" data-testid="fb-ad-headline">
                  {adCopy.headline}
                </div>
                <div className="fb-ad-description" data-testid="fb-ad-description">
                  {adCopy.description}
                </div>
                <button className="fb-ad-cta" data-testid="fb-ad-cta">
                  {adCopy.call_to_action.replace(/_/g, ' ')}
                </button>
              </div>
            </div>

            {/* Ad Copy Details */}
            <div className="fb-ad-copy-section">
              <h3 className="section-subtitle">Ad Copy Details</h3>
              
              <div className="copy-item">
                <div className="copy-label">Headline (Max 40 characters)</div>
                <div className="copy-text">{adCopy.headline}</div>
                <button
                  onClick={() => copyToClipboard(adCopy.headline, "Headline")}
                  className="copy-btn-small"
                  data-testid="copy-headline-btn"
                >
                  <Copy size={16} />
                </button>
              </div>

              <div className="copy-item">
                <div className="copy-label">Primary Text</div>
                <div className="copy-text">{adCopy.primary_text}</div>
                <button
                  onClick={() => copyToClipboard(adCopy.primary_text, "Primary text")}
                  className="copy-btn-small"
                  data-testid="copy-primary-btn"
                >
                  <Copy size={16} />
                </button>
              </div>

              <div className="copy-item">
                <div className="copy-label">Description</div>
                <div className="copy-text">{adCopy.description}</div>
                <button
                  onClick={() => copyToClipboard(adCopy.description, "Description")}
                  className="copy-btn-small"
                  data-testid="copy-description-btn"
                >
                  <Copy size={16} />
                </button>
              </div>

              <div className="copy-item">
                <div className="copy-label">Call to Action</div>
                <div className="copy-text">{adCopy.call_to_action}</div>
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button onClick={copyAllContent} className="modal-btn primary" data-testid="copy-all-btn">
              <Copy size={20} />
              Copy All Content
            </button>
            <button onClick={onClose} className="modal-btn secondary">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FacebookAdPreview;
