import React, { useState } from 'react'
import Button from '../components/Button';

export default function RequestAdmin() {
    const [form, setForm] = useState({
        name: "",
        email: "",
        portfolio: ""
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    function onChange(e) {
        setForm(prev => ({...prev, [e.target.name]: e.target.value}));
    }

    async function onSubmit(e) {
        e.preventDefault();
        setError(null);
        setMessage(null);

        if (!form.name.trim() || !form.email.trim()) {
            setError("Name and Email are required");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/request-admin', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(form)
            });

            const data = await res.json();
            if (!res.ok) {
                const txt = await res.text();
                throw new error(`Failed to submit request: ${text}`);
            }
            setForm({
                name:"",
                email:"",
                portfolio:""
            });
        }
        catch(err) {
            setError(err.message);
        }
        finally{
            setLoading(false);
        }
    }


  return (
    <div className="bg-neutral-900/95 w-full min-h-screen">
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-extrabold font-mono text-gray-300 pb-2 mb-6 border-b border-gray-200">If you want to contribute to the Blog</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Full name</label>
          <input name="name" value={form.name} onChange={onChange}
                 className="border mt-1 block w-full px-3 py-2 border-gray-300 placeholder-gray-300 rounded-md focus:outline-none focus:ring-terra focus:border-terra sm:text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
          <input name="email" value={form.email} onChange={onChange}
                 type="email"
                 className="border mt-1 block w-full px-3 py-2 border-gray-300 placeholder-gray-300 rounded-md focus:outline-none focus:ring-terra focus:border-terra sm:text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Portfolio / relevant links (optional)</label>
          <input name="portfolio" value={form.portfolio} onChange={onChange}
                 className="border mt-1 block w-full px-3 py-2 border-gray-300 placeholder-gray-300 rounded-md focus:outline-none focus:ring-terra focus:border-terra sm:text-sm" />
        </div>

        <div>
            <Button type='submit' disabled={loading} variant='primary'>
                {loading ? "Submitting..." : "Submit Request"}
            </Button>
            {message && <span className='text-green-400 px-2'>{message}</span>}
            {error && <span className='text-red-400 px-2'>{error}</span>}
        </div>
      </form>
    </div>
    </div>
  )
}
