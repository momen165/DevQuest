import React, {useState, useEffect} from 'react';
import {useSearchParams, useNavigate} from 'react-router-dom';
import axios from 'axios';

const VerifyEmail = () => {
    const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
    const [message, setMessage] = useState('');
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const verifyEmail = async () => {
            const token = searchParams.get('token');

            if (!token) {
                setStatus('error');
                setMessage('Invalid or missing verification token.');
                return;
            }

            try {
                const response = await axios.get(
                    `/api/verify-email`,
                    {params: {token}}
                );
                setStatus('success');
                setMessage(response.data.message);
            } catch (error) {
                setStatus('error');
                setMessage(
                    error.response?.data?.message || 'An error occurred while verifying your email.'
                );
            }
        };

        verifyEmail();
    }, [searchParams]);

    const handleRedirect = () => {
        navigate('/LoginPage'); // Redirect to the login page
    };

    return (
        <div style={styles.container}>
            {status === 'loading' && <p>Verifying your email, please wait...</p>}
            {status === 'success' && (
                <div>
                    <h1 style={styles.success}>Email Verified Successfully</h1>
                    <p>{message}</p>
                    <button onClick={handleRedirect} style={styles.button}>
                        Go to Login
                    </button>
                </div>
            )}
            {status === 'error' && (
                <div>
                    <h1 style={styles.error}>Email Verification Failed</h1>
                    <p>{message}</p>
                    <button onClick={handleRedirect} style={styles.button}>
                        Try Again
                    </button>
                </div>
            )}
        </div>
    );
};

// Inline styles for simplicity
const styles = {
    container: {
        textAlign: 'center',
        marginTop: '20vh',
        fontFamily: 'Arial, sans-serif',
    },
    success: {
        color: 'green',
    },
    error: {
        color: 'red',
    },
    button: {
        marginTop: '20px',
        padding: '10px 20px',
        fontSize: '16px',
        backgroundColor: '#007bff',
        color: '#fff',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
    },
};

export default VerifyEmail;
