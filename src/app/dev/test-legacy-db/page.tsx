'use client';

import { useState, useEffect } from 'react';

interface TestRecord {
    CampaignID: number;
    SourceID: number;
    PublisherID: number;
    SubID: string;
    FirstName: string;
    LastName: string;
    Email: string;
    Phone: string;
    AlternatePhone: string | null;
    Address: string;
    Address2: string | null;
    City: string;
    State: string;
    ZipCode: string;
    Country: string;
    TestLead: number;
    NetworkID: number;
    LeadCost: number;
    Currency: string;
    Payin: number;
    PayOutType: number;
    CurrencyIn: string;
}

interface LegacyRecord {
    LeadID: number;
    PostDT: string;
    CampaignID: number;
    SourceID: number;
    PublisherID: number;
    SubID: string;
    FirstName: string;
    LastName: string;
    Email: string;
    Phone: string;
}

interface AppRecord {
    id: number;
    legacyLeadId: string;
    campaignId: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    status: string;
    createdAt: string;
    intakeToken: string;
}

export default function TestLegacyDbPage() {
    const [formValues, setFormValues] = useState<TestRecord>({
        CampaignID: 11302,
        SourceID: 6343,
        PublisherID: 40235,
        SubID: 'TEST',
        FirstName: 'TEST',
        LastName: 'TEST',
        Email: 'ARDABASOGLU@GMAIL.COM',
        Phone: '+905326666815',
        AlternatePhone: null,
        Address: '1260 NW 133 AVE',
        Address2: null,
        City: 'Fort Lauderdale',
        State: 'FL',
        ZipCode: '33323',
        Country: 'USA',
        TestLead: 1,
        NetworkID: 10000,
        LeadCost: 0.00,
        Currency: 'USD',
        Payin: 0.00,
        PayOutType: 1,
        CurrencyIn: 'USD'
    });

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [existingLegacyRecords, setExistingLegacyRecords] = useState<LegacyRecord[]>([]);
    const [relatedAppRecords, setRelatedAppRecords] = useState<AppRecord[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const response = await fetch('/api/dev/test-legacy-db');
            const data = await response.json();
            setExistingLegacyRecords(data.existingLegacyRecords || []);
            setRelatedAppRecords(data.relatedAppRecords || []);
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    };

    const executeAction = async (action: 'insert' | 'delete' | 'cleanup') => {
        setLoading(true);
        setResult(null);

        try {
            const response = await fetch('/api/dev/test-legacy-db', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action,
                    customValues: formValues,
                }),
            });

            const data = await response.json();
            setResult(data);

            // Reload data after action
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

    const triggerLeadPolling = async () => {
        setLoading(true);
        setResult(null);

        try {
            const response = await fetch('/api/dev/test-lead-polling', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'poll',
                }),
            });

            const data = await response.json();
            setResult(data);

            // Reload data after polling
            setTimeout(loadData, 2000);
        } catch (error) {
            setResult({
                success: false,
                error: 'Network error: ' + (error instanceof Error ? error.message : 'Unknown error'),
            });
        } finally {
            setLoading(false);
        }
    };

    const resetToDefaults = () => {
        setFormValues({
            CampaignID: 11302,
            SourceID: 6343,
            PublisherID: 40235,
            SubID: 'TEST',
            FirstName: 'TEST',
            LastName: 'TEST',
            Email: 'ARDABASOGLU@GMAIL.COM',
            Phone: '+905326666815',
            AlternatePhone: null,
            Address: '1260 NW 133 AVE',
            Address2: null,
            City: 'Fort Lauderdale',
            State: 'FL',
            ZipCode: '33323',
            Country: 'USA',
            TestLead: 1,
            NetworkID: 10000,
            LeadCost: 0.00,
            Currency: 'USD',
            Payin: 0.00,
            PayOutType: 1,
            CurrencyIn: 'USD'
        });
    };

    const updateFormValue = (field: keyof TestRecord, value: string | number | null) => {
        setFormValues(prev => ({
            ...prev,
            [field]: value
        }));
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-6xl mx-auto px-4">
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-6">
                        Legacy Database Testing
                    </h1>

                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                        <h3 className="font-medium text-blue-800 mb-2">Integration Testing</h3>
                        <p className="text-blue-700 text-sm">
                            This tool allows you to insert and delete test records in the legacy MS SQL Server database
                            to simulate real-world scenarios during integration testing. When you delete a record from
                            the legacy database, related records in the app database will also be cleaned up.
                        </p>
                    </div>

                    {/* Form Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign ID</label>
                            <input
                                type="number"
                                value={formValues.CampaignID}
                                onChange={(e) => updateFormValue('CampaignID', parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Source ID</label>
                            <input
                                type="number"
                                value={formValues.SourceID}
                                onChange={(e) => updateFormValue('SourceID', parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Publisher ID</label>
                            <input
                                type="number"
                                value={formValues.PublisherID}
                                onChange={(e) => updateFormValue('PublisherID', parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sub ID</label>
                            <input
                                type="text"
                                value={formValues.SubID}
                                onChange={(e) => updateFormValue('SubID', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                            <input
                                type="text"
                                value={formValues.FirstName}
                                onChange={(e) => updateFormValue('FirstName', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                            <input
                                type="text"
                                value={formValues.LastName}
                                onChange={(e) => updateFormValue('LastName', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                value={formValues.Email}
                                onChange={(e) => updateFormValue('Email', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            <input
                                type="tel"
                                value={formValues.Phone}
                                onChange={(e) => updateFormValue('Phone', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Alternate Phone</label>
                            <input
                                type="tel"
                                value={formValues.AlternatePhone || ''}
                                onChange={(e) => updateFormValue('AlternatePhone', e.target.value || null)}
                                placeholder="Optional"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                            <input
                                type="text"
                                value={formValues.Address}
                                onChange={(e) => updateFormValue('Address', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Address 2</label>
                            <input
                                type="text"
                                value={formValues.Address2 || ''}
                                onChange={(e) => updateFormValue('Address2', e.target.value || null)}
                                placeholder="Optional"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                            <input
                                type="text"
                                value={formValues.City}
                                onChange={(e) => updateFormValue('City', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                            <input
                                type="text"
                                value={formValues.State}
                                onChange={(e) => updateFormValue('State', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
                            <input
                                type="text"
                                value={formValues.ZipCode}
                                onChange={(e) => updateFormValue('ZipCode', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                            <input
                                type="text"
                                value={formValues.Country}
                                onChange={(e) => updateFormValue('Country', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Test Lead</label>
                            <select
                                value={formValues.TestLead}
                                onChange={(e) => updateFormValue('TestLead', parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value={1}>Yes (1)</option>
                                <option value={0}>No (0)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Network ID</label>
                            <input
                                type="number"
                                value={formValues.NetworkID}
                                onChange={(e) => updateFormValue('NetworkID', parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Lead Cost</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formValues.LeadCost}
                                onChange={(e) => updateFormValue('LeadCost', parseFloat(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                            <input
                                type="text"
                                maxLength={3}
                                value={formValues.Currency}
                                onChange={(e) => updateFormValue('Currency', e.target.value.toUpperCase())}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Pay In</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formValues.Payin}
                                onChange={(e) => updateFormValue('Payin', parseFloat(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Pay Out Type</label>
                            <select
                                value={formValues.PayOutType}
                                onChange={(e) => updateFormValue('PayOutType', parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value={1}>Type 1</option>
                                <option value={2}>Type 2</option>
                                <option value={3}>Type 3</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Currency In</label>
                            <input
                                type="text"
                                maxLength={3}
                                value={formValues.CurrencyIn}
                                onChange={(e) => updateFormValue('CurrencyIn', e.target.value.toUpperCase())}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-4 mb-6">
                        <button
                            onClick={() => executeAction('insert')}
                            disabled={loading}
                            className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Processing...' : 'Insert Test Record'}
                        </button>

                        <button
                            onClick={() => executeAction('delete')}
                            disabled={loading}
                            className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Processing...' : 'Delete Test Record'}
                        </button>

                        <button
                            onClick={() => executeAction('cleanup')}
                            disabled={loading}
                            className="bg-orange-600 text-white px-6 py-2 rounded-md hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Processing...' : 'Cleanup App Records Only'}
                        </button>

                        <button
                            onClick={resetToDefaults}
                            disabled={loading}
                            className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            Reset to Defaults
                        </button>

                        <button
                            onClick={loadData}
                            disabled={loading}
                            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            Refresh Data
                        </button>
                        
                        <button
                            onClick={triggerLeadPolling}
                            disabled={loading}
                            className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            Trigger Lead Polling
                        </button>
                    </div>

                    {/* Result Display */}
                    {result && (
                        <div className={`mb-6 p-4 rounded-md ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                            <h3 className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                                {result.success ? 'Success!' : 'Error'}
                            </h3>
                            <pre className={`mt-2 text-sm ${result.success ? 'text-green-700' : 'text-red-700'} whitespace-pre-wrap`}>
                                {JSON.stringify(result, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>

                {/* Existing Records */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Legacy Database Records */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            Legacy Database Records ({existingLegacyRecords.length})
                        </h2>

                        {existingLegacyRecords.length === 0 ? (
                            <p className="text-gray-500">No matching test records found in legacy database.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Lead ID</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {existingLegacyRecords.map((record, index) => (
                                            <tr key={index}>
                                                <td className="px-4 py-2 text-sm font-medium text-gray-900">{record.LeadID}</td>
                                                <td className="px-4 py-2 text-sm text-gray-500">
                                                    {new Date(record.PostDT).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-500">{record.CampaignID}</td>
                                                <td className="px-4 py-2 text-sm text-gray-500">
                                                    {record.FirstName} {record.LastName}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* App Database Records */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            App Database Records ({relatedAppRecords.length})
                        </h2>

                        {relatedAppRecords.length === 0 ? (
                            <p className="text-gray-500">No related records found in app database.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">App ID</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Legacy ID</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Token</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {relatedAppRecords.map((record) => (
                                            <tr key={record.id}>
                                                <td className="px-4 py-2 text-sm font-medium text-gray-900">{record.id}</td>
                                                <td className="px-4 py-2 text-sm text-gray-500">{record.legacyLeadId}</td>
                                                <td className="px-4 py-2 text-sm">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${record.status === 'COMPLETED'
                                                        ? 'bg-green-100 text-green-800'
                                                        : record.status === 'PENDING'
                                                            ? 'bg-yellow-100 text-yellow-800'
                                                            : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {record.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-500 font-mono">
                                                    {record.intakeToken ? `${record.intakeToken.substring(0, 8)}...` : 'None'}
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
        </div>
    );
}