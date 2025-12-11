'use client';

import { useState, useEffect } from 'react';
import { Home, Building, Layers, Mountain, Plus, X, Check } from 'lucide-react';
import { API } from '@/lib/config';

interface PropertyTemplate {
  id: string;
  name: string;
  description?: string;
  property_type: string;
  beds: number;
  baths: number;
  carpark: number;
  features?: string;
  default_agent1_name?: string;
  default_agent1_phone?: string;
  is_system?: boolean;
}

interface PropertyTemplatesProps {
  onSelect: (template: PropertyTemplate) => void;
  onClose: () => void;
  userEmail?: string;
}

const TYPE_ICONS: Record<string, any> = {
  'House': Home,
  'Apartment': Building,
  'Townhouse': Layers,
  'Land': Mountain,
};

export default function PropertyTemplates({ onSelect, onClose, userEmail }: PropertyTemplatesProps) {
  const [templates, setTemplates] = useState<PropertyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    property_type: 'House',
    beds: 3,
    baths: 2,
    carpark: 2,
    features: ''
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const headers: Record<string, string> = {};
      if (userEmail) headers['x-user-email'] = userEmail;

      const response = await fetch(`${API}/templates`, { headers });
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim()) return;

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (userEmail) headers['x-user-email'] = userEmail;

      const response = await fetch(`${API}/templates`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newTemplate)
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates([...templates, data.template]);
        setShowCreateForm(false);
        setNewTemplate({
          name: '',
          description: '',
          property_type: 'House',
          beds: 3,
          baths: 2,
          carpark: 2,
          features: ''
        });
      }
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await fetch(`${API}/templates?id=${templateId}`, { method: 'DELETE' });
      setTemplates(templates.filter(t => t.id !== templateId));
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const getIcon = (propertyType: string) => {
    const Icon = TYPE_ICONS[propertyType] || Home;
    return <Icon className="w-5 h-5" />;
  };

  // Group templates by type
  const systemTemplates = templates.filter(t => t.is_system);
  const userTemplates = templates.filter(t => !t.is_system);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Property Templates</h2>
            <p className="text-sm text-gray-500">Quick-start with a pre-filled template</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-140px)]">
          {loading ? (
            <p className="text-center text-gray-500 py-8">Loading templates...</p>
          ) : (
            <>
              {/* System Templates */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Standard Templates
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {systemTemplates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => onSelect(template)}
                      className="p-4 border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-blue-600">{getIcon(template.property_type)}</span>
                        <span className="font-medium text-gray-900 group-hover:text-blue-700">
                          {template.name}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{template.description}</p>
                      <div className="flex gap-2 mt-2 text-xs text-gray-400">
                        <span>{template.beds} bed</span>
                        <span>•</span>
                        <span>{template.baths} bath</span>
                        <span>•</span>
                        <span>{template.carpark} car</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* User Templates */}
              {userTemplates.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Your Templates
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {userTemplates.map(template => (
                      <div
                        key={template.id}
                        className="p-4 border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group relative"
                      >
                        <button
                          onClick={() => onSelect(template)}
                          className="w-full text-left"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-purple-600">{getIcon(template.property_type)}</span>
                            <span className="font-medium text-gray-900 group-hover:text-blue-700">
                              {template.name}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">{template.description}</p>
                          <div className="flex gap-2 mt-2 text-xs text-gray-400">
                            <span>{template.beds} bed</span>
                            <span>•</span>
                            <span>{template.baths} bath</span>
                          </div>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(template.id); }}
                          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Create New Template */}
              {!showCreateForm ? (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 text-gray-500 hover:text-blue-600"
                >
                  <Plus className="w-5 h-5" />
                  Create Custom Template
                </button>
              ) : (
                <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
                  <h4 className="font-medium text-gray-900 mb-3">New Template</h4>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Template name"
                      value={newTemplate.name}
                      onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Description (optional)"
                      value={newTemplate.description}
                      onChange={e => setNewTemplate({ ...newTemplate, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                    <div className="grid grid-cols-4 gap-2">
                      <select
                        value={newTemplate.property_type}
                        onChange={e => setNewTemplate({ ...newTemplate, property_type: e.target.value })}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      >
                        <option value="House">House</option>
                        <option value="Apartment">Apartment</option>
                        <option value="Townhouse">Townhouse</option>
                        <option value="Land">Land</option>
                      </select>
                      <input
                        type="number"
                        placeholder="Beds"
                        value={newTemplate.beds}
                        onChange={e => setNewTemplate({ ...newTemplate, beds: parseInt(e.target.value) || 0 })}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Baths"
                        value={newTemplate.baths}
                        onChange={e => setNewTemplate({ ...newTemplate, baths: parseInt(e.target.value) || 0 })}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Cars"
                        value={newTemplate.carpark}
                        onChange={e => setNewTemplate({ ...newTemplate, carpark: parseInt(e.target.value) || 0 })}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                    </div>
                    <textarea
                      placeholder="Default features (comma separated)"
                      value={newTemplate.features}
                      onChange={e => setNewTemplate({ ...newTemplate, features: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                      rows={2}
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setShowCreateForm(false)}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateTemplate}
                        disabled={!newTemplate.name.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                      >
                        <Check className="w-4 h-4" />
                        Save Template
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
