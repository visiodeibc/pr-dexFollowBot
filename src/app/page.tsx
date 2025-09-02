export default function Home() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      fontFamily: 'system-ui, sans-serif',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤖</h1>
      <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#333' }}>
        Telegram Bot Vercel
      </h2>
      <p style={{ fontSize: '1.2rem', color: '#666', maxWidth: '600px', lineHeight: '1.6' }}>
        Your Telegram bot is running! This is a Next.js application with grammY and Supabase integration,
        ready to be deployed on Vercel.
      </p>
      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <p><strong>Webhook endpoint:</strong> <code>/api/tg</code></p>
        <p><strong>Status:</strong> ✅ Active</p>
      </div>
    </div>
  );
}