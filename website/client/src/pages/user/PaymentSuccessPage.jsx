// File: `website/client/src/pages/user/PaymentSuccessPage.js`
import React, {useEffect, useState} from 'react';
import {useLocation} from 'react-router-dom';
import axios from 'axios';
import 'styles/PaymentSuccessPage.css';

const PaymentSuccessPage = () => {
    const location = useLocation();
    const [sessionId, setSessionId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        const query = new URLSearchParams(location.search);
        const sessionId = query.get('session_id');
        setSessionId(sessionId);

        if (sessionId) {
            axios.get(`${process.env.REACT_APP_API_URL}/checkout-session/${sessionId}`)
                .then(response => {
                    setMessage('Payment successful! Thank you for your purchase.');
                    setIsSuccess(true);
                })
                .catch(error => {
                    setMessage('There was an issue retrieving your session. Please contact support.');
                    setIsSuccess(false);
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            setMessage('No session ID found.');
            setIsSuccess(false);
            setLoading(false);
        }
    }, [location.search]);

    return (
        <div className="payment-success-page">
            <h1>Payment Status</h1>
            {loading ? (
                <p>Loading...</p>
            ) : (
                <div className={`message ${isSuccess ? 'success' : 'error'}`}>
                    <p>{message}</p>
                </div>
            )}
        </div>
    );
};

export default PaymentSuccessPage;