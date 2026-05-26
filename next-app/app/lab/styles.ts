// app/lab/styles.ts
// Shared inline style objects for lab page components

import React from 'react';

export const labelStyle: React.CSSProperties = {
	display: 'block',
	fontSize: '0.78rem',
	color: 'var(--muted)',
	marginBottom: '6px',
	textTransform: 'uppercase',
	letterSpacing: '0.5px',
};

export const inputStyle: React.CSSProperties = {
	width: '100%',
	padding: '9px 12px',
	borderRadius: '8px',
	border: '1px solid var(--border)',
	background: 'rgba(255,255,255,0.05)',
	color: 'var(--white)',
	fontSize: '0.88rem',
	fontFamily: 'inherit',
	outline: 'none',
};

export const primaryBtnStyle: React.CSSProperties = {
	padding: '10px 24px',
	borderRadius: '8px',
	border: 'none',
	background: 'linear-gradient(135deg, var(--teal-dark), var(--teal))',
	color: 'white',
	fontWeight: 600,
	fontSize: '0.9rem',
	cursor: 'pointer',
	boxShadow: '0 4px 20px rgba(0,180,216,0.3)',
	transition: 'all 0.2s',
};

export const secondaryBtnStyle: React.CSSProperties = {
	padding: '10px 24px',
	borderRadius: '8px',
	border: '1px solid var(--border)',
	background: 'var(--card-bg)',
	color: 'var(--muted)',
	fontWeight: 500,
	fontSize: '0.9rem',
	cursor: 'pointer',
};
