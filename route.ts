import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { account_number, bank_code } = await req.json();
    
    const response = await fetch(`https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error resolving account:', error);
    return NextResponse.json({ status: false, message: 'Failed to resolve account' }, { status: 500 });
  }
}