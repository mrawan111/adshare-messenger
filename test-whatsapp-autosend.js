// Test script to verify WhatsApp auto-send functionality
// This can be run in the browser console to test the automation

console.log('🧪 Testing WhatsApp Auto-Send Functionality...');

// Test the phone number formatting
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

// Test cases
const testPhoneNumbers = [
  '01234567890',
  '201234567890',
  '1234567890',
  '+201234567890'
];

console.log('📱 Testing phone number formatting:');
testPhoneNumbers.forEach(phone => {
  const formatted = formatPhoneNumber(phone);
  console.log(`${phone} -> ${formatted}`);
});

// Test if Chrome APIs are available
console.log('🔍 Checking Chrome Extension APIs:');
if (typeof window !== 'undefined' && window.chrome) {
  console.log('✅ Chrome APIs available');
  console.log('Tabs API:', !!window.chrome.tabs);
  console.log('Scripting API:', !!window.chrome.scripting);
  console.log('Runtime API:', !!window.chrome.runtime);
} else {
  console.log('❌ Chrome APIs not available');
}

// Test WhatsApp Web detection
console.log('🌐 Checking WhatsApp Web tabs:');
if (window.chrome?.tabs) {
  window.chrome.tabs.query({ url: "*://web.whatsapp.com/*" })
    .then(tabs => {
      console.log(`Found ${tabs.length} WhatsApp Web tab(s)`);
      tabs.forEach((tab, index) => {
        console.log(`Tab ${index + 1}: ${tab.url} (ID: ${tab.id})`);
      });
    })
    .catch(error => {
      console.error('Error querying tabs:', error);
    });
} else {
  console.log('❌ Cannot check tabs - Chrome Tabs API not available');
}

console.log('✅ Test completed. Check the results above.');
console.log('💡 To test the actual auto-send:');
console.log('1. Make sure WhatsApp Web is open and logged in');
console.log('2. Select some contacts in the app');
console.log('3. Write a test message');
console.log('4. Enable Auto Mode and select "Auto Send (WhatsApp Web)"');
console.log('5. Start the campaign and monitor the results');
