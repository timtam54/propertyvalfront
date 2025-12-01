import { X, Copy, Facebook, Heart, MessageCircle, Share2, Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";

function FacebookPostPreview({ property, postContent, onClose }) {
  const copyToClipboard = async (text) => {
    try {
      // Try modern Clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        toast.success("Post copied to clipboard!");
      } else {
        // Fallback method
        fallbackCopyToClipboard(text);
        toast.success("Post copied to clipboard!");
      }
    } catch (err) {
      // If Clipboard API fails, use fallback
      try {
        fallbackCopyToClipboard(text);
        toast.success("Post copied to clipboard!");
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

  const downloadImage = async (imageBase64, index) => {
    try {
      // Convert base64 to blob for more reliable downloads
      const response = await fetch(imageBase64);
      const blob = await response.blob();
      
      // Create a blob URL
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = blobUrl;
      
      // Create a cleaner filename
      const locationName = property.location.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
      link.download = `property_${locationName}_photo_${index + 1}.jpg`;
      
      // Force download attribute
      link.setAttribute('download', `property_${locationName}_photo_${index + 1}.jpg`);
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(blobUrl);
      
      toast.success(`Photo ${index + 1} downloaded!`);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error(`Failed to download photo ${index + 1}: ${error.message}`);
    }
  };

  const downloadAllImages = async () => {
    if (!property.images || property.images.length === 0) {
      toast.error("No images to download");
      return;
    }

    const totalImages = property.images.length;
    
    // Show initial message with instructions
    toast.info(
      `Starting download of ${totalImages} images. Please allow downloads when prompted by your browser!`,
      { duration: 5000 }
    );
    
    let downloadedCount = 0;
    let failedCount = 0;
    
    // Download each image with a slight delay to avoid browser blocking
    for (let index = 0; index < property.images.length; index++) {
      try {
        await new Promise(resolve => setTimeout(resolve, index * 500)); // 500ms delay
        await downloadImage(property.images[index], index);
        downloadedCount++;
      } catch (error) {
        failedCount++;
        console.error(`Failed to download image ${index + 1}:`, error);
      }
    }
    
    // Show completion message
    setTimeout(() => {
      if (failedCount === 0) {
        toast.success(
          `✓ All ${totalImages} photos downloaded! Check your Downloads folder.`,
          { duration: 8000 }
        );
      } else {
        toast.warning(
          `Downloaded ${downloadedCount} of ${totalImages} photos. ${failedCount} failed. Try downloading individually by clicking each photo.`,
          { duration: 10000 }
        );
      }
    }, 500);
  };

  const viewImagesInNewTabs = () => {
    if (!property.images || property.images.length === 0) {
      toast.error("No images to view");
      return;
    }

    toast.info("Opening images in new tabs. Right-click and 'Save Image As' to download!");
    
    property.images.forEach((img, index) => {
      setTimeout(() => {
        window.open(img, '_blank');
      }, index * 200);
    });
  };

  return (
    <div className="modal-overlay" data-testid="facebook-post-modal">
      <div className="modal-content facebook-post-modal">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Facebook className="text-blue-600" size={28} />
            <h2 className="modal-title">Facebook Post Preview</h2>
          </div>
          <button onClick={onClose} className="modal-close-btn" data-testid="close-post-modal-btn">
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <div className="fb-post-container">
            {/* Facebook Post Preview */}
            <div className="fb-post-preview">
              {/* Post Header */}
              <div className="fb-post-header">
                <div className="fb-post-profile">
                  <div className="fb-post-avatar">
                    <Facebook size={20} className="text-white" />
                  </div>
                  <div>
                    <div className="fb-post-page-name">Your Real Estate Page</div>
                    <div className="fb-post-time">Just now · 🌐</div>
                  </div>
                </div>
              </div>

              {/* Post Content */}
              <div className="fb-post-text" data-testid="fb-post-content">
                {postContent}
              </div>

              {/* Post Images */}
              {property.images && property.images.length > 0 && (
                <div className="fb-post-images">
                  {property.images.length === 1 && (
                    <div className="fb-post-single-image">
                      <img src={property.images[0]} alt="Property" />
                    </div>
                  )}
                  
                  {property.images.length === 2 && (
                    <div className="fb-post-two-images">
                      <img src={property.images[0]} alt="Property 1" />
                      <img src={property.images[1]} alt="Property 2" />
                    </div>
                  )}
                  
                  {property.images.length === 3 && (
                    <div className="fb-post-three-images">
                      <div className="fb-post-main-img">
                        <img src={property.images[0]} alt="Property 1" />
                      </div>
                      <div className="fb-post-side-imgs">
                        <img src={property.images[1]} alt="Property 2" />
                        <img src={property.images[2]} alt="Property 3" />
                      </div>
                    </div>
                  )}
                  
                  {property.images.length >= 4 && (
                    <div className="fb-post-grid-images">
                      <img src={property.images[0]} alt="Property 1" />
                      <img src={property.images[1]} alt="Property 2" />
                      <img src={property.images[2]} alt="Property 3" />
                      <div className="fb-post-more-images">
                        <img src={property.images[3]} alt="Property 4" />
                        {property.images.length > 4 && (
                          <div className="fb-post-overlay">+{property.images.length - 4}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Post Actions */}
              <div className="fb-post-actions">
                <div className="fb-post-action">
                  <Heart size={18} />
                  <span>Like</span>
                </div>
                <div className="fb-post-action">
                  <MessageCircle size={18} />
                  <span>Comment</span>
                </div>
                <div className="fb-post-action">
                  <Share2 size={18} />
                  <span>Share</span>
                </div>
              </div>
            </div>

            {/* Post Details Section */}
            <div className="fb-post-details-section">
              <h3 className="section-subtitle">Ready to Post!</h3>
              <p style={{ color: '#64748b', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                Your engaging Facebook post is ready. Copy the content below and paste it directly into your Facebook page along with the property images.
              </p>

              <div className="post-content-box">
                <div className="post-content-text" data-testid="copyable-post-content">
                  {postContent}
                </div>
              </div>

              <div className="post-stats">
                <div className="post-stat-item">
                  <span className="post-stat-label">Word Count:</span>
                  <span className="post-stat-value">{postContent.split(/\s+/).length} words</span>
                </div>
                <div className="post-stat-item">
                  <span className="post-stat-label">Images:</span>
                  <span className="post-stat-value">{property.images?.length || 0} photos</span>
                </div>
                <div className="post-stat-item">
                  <span className="post-stat-label">Emojis:</span>
                  <span className="post-stat-value">{(postContent.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || []).length}</span>
                </div>
              </div>

              {property.images && property.images.length > 0 && (
                <div className="images-download-section">
                  <h4 className="images-section-title">Property Images ({property.images.length})</h4>
                  <p className="images-section-desc">
                    Click "Download All Images" below or click individual photos to download them
                  </p>
                  
                  <div className="download-instructions">
                    <div className="instruction-item">
                      <span className="instruction-number">1</span>
                      <span className="instruction-text">Click "Download All Images" button</span>
                    </div>
                    <div className="instruction-item">
                      <span className="instruction-number">2</span>
                      <span className="instruction-text">Check your Downloads folder or browser's download bar</span>
                    </div>
                    <div className="instruction-item">
                      <span className="instruction-number">3</span>
                      <span className="instruction-text">Upload images when posting to Facebook</span>
                    </div>
                  </div>

                  <div className="images-thumbnail-grid">
                    {property.images.map((img, index) => (
                      <div key={index} className="image-thumbnail" onClick={() => downloadImage(img, index)}>
                        <img src={img} alt={`Property ${index + 1}`} />
                        <div className="image-download-overlay">
                          <Download size={20} />
                          <span style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>Click</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer-note">
            <strong>💡 Two Ways to Get Images:</strong>
            <p>
              <strong>Option 1:</strong> Click "Download All" - Images save to your Downloads folder.<br/>
              <strong>Option 2:</strong> Click "Open in Tabs" - Each image opens in a new tab. Right-click any image and select "Save Image As..."<br/>
              <em>Note: Some browsers may block multiple downloads. If "Download All" doesn't work, use "Open in Tabs" instead.</em>
            </p>
          </div>

          <div className="modal-actions">
            <button 
              onClick={() => copyToClipboard(postContent)} 
              className="modal-btn primary" 
              data-testid="copy-post-btn"
            >
              <Copy size={20} />
              Copy Post Text
            </button>
            {property.images && property.images.length > 0 && (
              <>
                <button 
                  onClick={downloadAllImages} 
                  className="modal-btn success" 
                  data-testid="download-all-images-btn"
                >
                  <Download size={20} />
                  Download All ({property.images.length})
                </button>
                <button 
                  onClick={viewImagesInNewTabs} 
                  className="modal-btn info" 
                  data-testid="view-images-btn"
                  title="Opens images in new tabs - Right-click to save"
                >
                  <ExternalLink size={20} />
                  Open in Tabs
                </button>
              </>
            )}
            <button onClick={onClose} className="modal-btn secondary">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FacebookPostPreview;
