import { NextResponse } from 'next/server';
import axios from 'axios';
import { getExplorerApiKey } from '@/utils/getExplorerApiKey';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action'); // 'txlist', 'txlistinternal', 'balance'
    const address = searchParams.get('address');
    const tag = searchParams.get('tag') || 'latest';

    if (!action || !address) {
        return NextResponse.json({ error: 'Missing action or address parameter' }, { status: 400 });
    }

    try {
        const apiKey = getExplorerApiKey();
        const baseUrl = 'https://api.etherscan.io/v2/api?chainid=8453&module=account';
        let url = '';

        if (action === 'txlist') {
            url = `${baseUrl}&action=txlist&address=${address}&sort=asc&apikey=${apiKey}`;
        } else if (action === 'txlistinternal') {
            url = `${baseUrl}&action=txlistinternal&address=${address}&sort=asc&apikey=${apiKey}`;
        } else if (action === 'balance') {
            url = `${baseUrl}&action=balance&address=${address}&tag=${tag}&apikey=${apiKey}`;
        } else if (action === 'getabi') {
            // Module is 'contract' for these actions, override baseUrl's module=account
            url = `https://api.etherscan.io/v2/api?chainid=8453&module=contract&action=getabi&address=${address}&apikey=${apiKey}`;
        } else if (action === 'getsourcecode') {
            url = `https://api.etherscan.io/v2/api?chainid=8453&module=contract&action=getsourcecode&address=${address}&apikey=${apiKey}`;
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        const response = await axios.get(url);

        // Check for Etherscan/Basescan API errors often returned as 200 OK with status "0"
        if (response.data.status === '0' && response.data.message !== 'No transactions found') {
            // Some "0" status responses are valid (e.g. valid empty list), others are errors.
            // Pass through the data let the client handle specific "status" checks,
            // but log it on server if needed.
        }

        return NextResponse.json(response.data);

    } catch (error: any) {
        console.error('Error fetching data from explorer:', error.message);
        return NextResponse.json({ error: 'Failed to fetch external data' }, { status: 500 });
    }
}
