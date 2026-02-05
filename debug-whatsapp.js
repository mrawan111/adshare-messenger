// Debug script to check Chrome Extension APIs and WhatsApp Web status
// Run this in the browser console to debug the automation

console.log('🔍 WhatsApp Auto-Send Debug Script');
console.log('=====================================');

// 1. Check Chrome APIs
console.log('📱 Chrome APIs Check:');
console.log('- chrome.tabs:', !!window.chrome?.tabs);
console.log('- chrome.scripting:', !!window.chrome?.scripting);
console.log('- chrome.runtime:', !!window.chrome?.runtime);

// 2. Check WhatsApp Web tabs
if (window.chrome?.tabs) {
  window.chrome.tabs.query({ url: "*://web.whatsapp.com/*" })
    .then(tabs => {
      console.log('📋 WhatsApp Web Tabs Found:', tabs.length);
      tabs.forEach((tab, index) => {
        console.log(`Tab ${index + 1}:`, {
          id: tab.id,
          url: tab.url,
          windowId: tab.windowId
        });
      });
      
      if (tabs.length === 0) {
        console.log('❌ No WhatsApp Web tabs found. Please open WhatsApp Web first.');
      } else {
        console.log('✅ WhatsApp Web tab(s) available for automation');
      }
    })
    .catch(error => {
      console.error('❌ Error querying tabs:', error);
    });
} else {
  console.log('❌ Chrome tabs API not available');
}

// 3. Test phone number formatting
const formatPhoneNumber = (phoneNumber) => {
  const cleaned = phoneNumber.replace(/\D/g, "");
  
  if (cleaned.startsWith('01')) {
    return cleaned.startsWith('20') ? cleaned : `20${cleaned}`;
  }
  
  if (cleaned.startsWith('20')) {
    return cleaned;
  }
  
  return cleaned;
};

console.log('📞 Phone Number Formatting Test:');
['01234567890', '201234567890', '1234567890'].forEach(phone => {
  console.log(`${phone} -> ${formatPhoneNumber(phone)}`);
});

// 4. Check if we can inject scripts
console.log('🔧 Script Injection Test:');
if (window.chrome?.scripting) {
  console.log('✅ Scripting API available');
  console.log('💡 Note: Script injection requires proper permissions and active tab');
} else {
  console.log('❌ Scripting API not available');
}

// 5. Manual test - try to find WhatsApp Web elements
console.log('🌐 WhatsApp Web Element Check (run this on WhatsApp Web tab):');
console.log(`
// Copy and paste this in WhatsApp Web tab console:
const searchBox = document.querySelector('[data-testid="search"] input');
const messageBox = document.querySelector('[data-testid="conversation-panel-body"] [contenteditable="true"]');
const sendButton = document.querySelector('[data-testid="send"]');

console.log('Search box:', !!searchBox);
console.log('Message box:', !!messageBox);
console.log('Send button:', !!sendButton);
`);

console.log('🎯 Debug Complete! Check the results above.');
console.log('💡 If Chrome APIs are not available, you may need to:');
console.log('   1. Install as a Chrome extension');
console.log('   2. Enable developer mode in Chrome');
console.log('   3. Grant proper permissions');
