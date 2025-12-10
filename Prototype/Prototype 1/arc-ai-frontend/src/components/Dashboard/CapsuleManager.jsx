import { useState, useEffect } from 'react';
import { capsuleAPI } from '../../utils/api';
import { t } from '../../i18n/strings';

const CapsuleManager = () => {
  const [capsules, setCapsules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCapsule, setSelectedCapsule] = useState(null);

  useEffect(() => {
    loadCapsules();
  }, []);

  const loadCapsules = async () => {
    setLoading(true);
    try {
      const response = await capsuleAPI.list();
      setCapsules(response.data);
    } catch (error) {
      console.error('Failed to load capsules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (capsuleId) => {
    try {
      const response = await capsuleAPI.get(capsuleId);
      setSelectedCapsule(response.data);
    } catch (error) {
      console.error('Failed to load capsule details:', error);
    }
  };

  const filteredCapsules = capsules.filter(
    (capsule) =>
      capsule.capsule_id.toLowerCase().includes(search.toLowerCase()) ||
      capsule.question_hash.toLowerCase().includes(search.toLowerCase()) ||
      capsule.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="card bg-steel-blue">
        <h2 className="text-2xl font-bold mb-4 text-white">{t('capsules.title')}</h2>
        <input
          type="text"
          placeholder={t('capsules.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input w-full"
        />
      </div>

      {loading ? (
        <div className="card bg-steel-blue text-white">Loading capsules...</div>
      ) : (
        <div className="card bg-steel-blue">
          <div className="space-y-4">
            {filteredCapsules.map((capsule) => (
              <div
                key={capsule.capsule_id}
                className="p-4 border border-white/30 rounded-xl hover:bg-white/10 text-white"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2 text-white">{capsule.title}</h3>
                    <div className="text-sm text-gray-200 space-y-1">
                      <p>
                        <strong>ID:</strong> {capsule.capsule_id}
                      </p>
                      <p>
                        <strong>Author:</strong> {capsule.author}
                      </p>
                      <p>
                        <strong>TTL:</strong> {capsule.ttl_days}{' '}
                        {t('capsules.days')}
                      </p>
                      <p>
                        <strong>{t('capsules.signatureVerified')}:</strong>{' '}
                        {capsule.signature_ok ? '✓ Yes' : '✗ No'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewDetails(capsule.capsule_id)}
                      className="btn-secondary text-sm"
                    >
                      View
                    </button>
                    <button className="btn-danger text-sm">
                      {t('capsules.revoke')}
                    </button>
                    <button className="btn-primary text-sm">
                      {t('capsules.promote')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Capsule Detail Modal */}
      {selectedCapsule && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedCapsule(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Capsule Details</h3>
              <button
                onClick={() => setSelectedCapsule(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <strong>Title:</strong> {selectedCapsule.title}
              </div>
              <div>
                <strong>Body Preview:</strong>
                <p className="mt-1 text-gray-600">
                  {selectedCapsule.body_preview}
                </p>
              </div>
              <div>
                <strong>Status:</strong> {selectedCapsule.status}
              </div>
              <div>
                <strong>Signed At:</strong>{' '}
                {new Date(selectedCapsule.signed_manifest.signed_at).toLocaleString()}
              </div>
              <div>
                <strong>Signature:</strong>{' '}
                <code className="text-xs">
                  {selectedCapsule.signed_manifest.signature}
                </code>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CapsuleManager;


