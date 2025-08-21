'use client';

import { useState, useEffect } from 'react';

interface Lead {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface NotificationLog {
  id: number;
  type: string;
  recipient: string;
  subject?: string;
  content: string;
  status: string;
  createdAt: string;
  sentAt?: string;
  errorMessage?: string;
  externalId?: string;
  lead?: Lead;
}

export default function TestNotificationsPage() {
  const [type, setType] = useState<'email' | 'sms'>('email');
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('Test Email from Fund Track');
  const [message, setMessage] = useState('This is a test notification from Fund Track system.');
  const [leadId, setLeadId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [recentNotifications, setRecentNotifications] = useState<NotificationLog[]>([]);
  const [sampleLeads, setSampleLeads] = useState<Lead[]>([]);

  // Load recent notifications and sample leads
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await fetch('/api/dev/test-notifications');
      const data = await response.json();
      setRecentNotifications(data.recentNotifications || []);
      setSampleLeads(data.sampleLeads || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const sendTestNotification = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/dev/test-notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          recipient,
          subject: type === 'email' ? subject : undefined,
          message,
          leadId: leadId || undefined,
        }),
      });

      const data = await response.json();
      setResult(data);
      
      // Reload recent notifications
      setTimeout(loadData, 1000);
    } catch (error) {
      setResult({
        success: false,
        error: 'Network error: ' + (error instanceof Error ? error.message : 'Unknown error'),
      });
    } finally {
      setLoading(false);
    }
  };

  const fillSampleLead = (lead: Lead) => {
    setRecipient(type === 'email' ? lead.email : lead.phone);
    setLeadId(lead.id.toString());
    if (type === 'email') {
      setSubject(`Test Email for ${lead.firstName} ${lead.lastName}`);
      setMessage(`Hello ${lead.firstName},\n\nThis is a test email from Fund Track system.\n\nBest regards,\nFund Track Team`);
    } else {
      setMessage(`Hello ${lead.firstName}, this is a test SMS from Fund Track system.`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Test Notifications
          </h1>
          
          {/* Notification Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notification Type
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="email"
                  checked={type === 'email'}
                  onChange={(e) => setType(e.target.value as 'email')}
                  className="mr-2"
                />
                Email
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="sms"
                  checked={type === 'sms'}
                  onChange={(e) => setType(e.target.value as 'sms')}
                  className="mr-2"
                />
                SMS
              </label>
            </div>
          </div>

          {/* Recipient */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipient ({type === 'email' ? 'Email' : 'Phone Number'})
            </label>
            <input
              type={type === 'email' ? 'email' : 'tel'}
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder={type === 'email' ? 'test@example.com' : '+1234567890'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Subject (Email only) */}
          {type === 'email' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Message */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Lead ID (Optional) */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lead ID (Optional)
            </label>
            <input
              type="number"
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              placeholder="Leave empty for no lead association"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Send Button */}
          <button
            onClick={sendTestNotification}
            disabled={loading || !recipient || !message || (type === 'email' && !subject)}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : `Send Test ${type.toUpperCase()}`}
          </button>

          {/* Result */}
          {result && (
            <div className={`mt-4 p-4 rounded-md ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h3 className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                {result.success ? 'Success!' : 'Error'}
              </h3>
              <p className={`mt-1 text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                {result.success ? (
                  <>
                    Notification sent successfully!
                    {result.externalId && <><br />External ID: {result.externalId}</>}
                  </>
                ) : (
                  result.error || 'Unknown error occurred'
                )}
              </p>
            </div>
          )}
        </div>

        {/* Sample Leads */}
        {sampleLeads.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Fill from Sample Leads
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sampleLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="border border-gray-200 rounded-md p-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => fillSampleLead(lead)}
                >
                  <div className="font-medium text-gray-900">
                    {lead.firstName} {lead.lastName}
                  </div>
                  <div className="text-sm text-gray-600">
                    ID: {lead.id}
                  </div>
                  <div className="text-sm text-gray-600">
                    Email: {lead.email}
                  </div>
                  <div className="text-sm text-gray-600">
                    Phone: {lead.phone}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Notifications */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Notifications
            </h2>
            <button
              onClick={loadData}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Refresh
            </button>
          </div>
          
          {recentNotifications.length === 0 ? (
            <p className="text-gray-500">No recent notifications found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recipient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lead
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentNotifications.map((notification) => (
                    <tr key={notification.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {notification.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {notification.recipient}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          notification.status === 'SENT' 
                            ? 'bg-green-100 text-green-800'
                            : notification.status === 'FAILED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {notification.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(notification.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {notification.lead ? (
                          `${notification.lead.firstName} ${notification.lead.lastName} (${notification.lead.id})`
                        ) : (
                          'No lead'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}