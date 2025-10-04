import React, { createContext, useContext, useState } from 'react';
import ImageModal from './ImageModal';

interface ImageModalContextType {
  openModal: (src: string, alt?: string, type?: 'image' | 'video') => void;
  closeModal: () => void;
}

const ImageModalContext = createContext<ImageModalContextType | undefined>(undefined);

export const useImageModal = () => {
  const context = useContext(ImageModalContext);
  if (!context) {
    throw new Error('useImageModal must be used within an ImageModalProvider');
  }
  return context;
};

interface ImageModalProviderProps {
  children: React.ReactNode;
}

export const ImageModalProvider: React.FC<ImageModalProviderProps> = ({ children }) => {
  const [modalData, setModalData] = useState<{ src: string; alt?: string; type?: 'image' | 'video' } | null>(null);

  const openModal = (src: string, alt?: string, type: 'image' | 'video' = 'image') => {
    setModalData({ src, alt, type });
  };

  const closeModal = () => {
    setModalData(null);
  };

  return (
    <ImageModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      {modalData && (
        <ImageModal 
          src={modalData.src}
          alt={modalData.alt || ''}
          type={modalData.type || 'image'}
          onClose={closeModal}
        />
      )}
    </ImageModalContext.Provider>
  );
};
