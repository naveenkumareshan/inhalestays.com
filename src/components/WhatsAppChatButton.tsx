import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { whatsappLeadService } from '@/api/whatsappLeadService';

interface WhatsAppChatButtonProps {
  partnerUserId: string;
  propertyType: 'cabin' | 'hostel' | 'mess';
  propertyId: string;
  propertyName: string;
  whatsappChatEnabled?: boolean;
}

export const WhatsAppChatButton: React.FC<WhatsAppChatButtonProps> = ({
  partnerUserId,
  propertyType,
  propertyId,
  propertyName,
  whatsappChatEnabled = false,
}) => {
  const [visible, setVisible] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');

  useEffect(() => {
    if (!partnerUserId || !whatsappChatEnabled) return;
    (async () => {
      const partnerData = await whatsappLeadService.getPartnerWhatsapp(partnerUserId);
      if (partnerData?.whatsapp_enabled && partnerData.whatsapp_number) {
        setWhatsappNumber(partnerData.whatsapp_number);
        setVisible(true);
      }
    })();
  }, [partnerUserId, whatsappChatEnabled]);

  if (!visible || !whatsappChatEnabled) return null;

  const typeLabel = propertyType === 'cabin' ? 'reading room' : propertyType;
  const message = `Hi, I'm interested in ${propertyName} (${typeLabel}). Can you share more details?`;
  const cleanNumber = whatsappNumber.replace(/[^0-9]/g, '');
  const waUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;

  const handleClick = async () => {
    whatsappLeadService.trackClick(partnerUserId, propertyType, propertyId);
    window.open(waUrl, '_blank');
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-full px-4 py-3 shadow-lg transition-transform hover:scale-105 active:scale-95"
      style={{ backgroundColor: '#25D366', color: '#fff' }}
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="h-5 w-5" fill="#fff" />
      <span className="text-sm font-semibold hidden sm:inline">Chat with us</span>
    </button>
  );
};
