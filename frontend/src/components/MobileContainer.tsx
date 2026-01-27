import React, { type ReactNode } from 'react';
import './MobileContainer.css';

interface MobileContainerProps {
    children: ReactNode;
}

export const MobileContainer: React.FC<MobileContainerProps> = ({ children }) => {
    return (
        <div className="mobile-wrapper">
            <div className="mobile-container">
                {children}
            </div>
        </div>
    );
};
