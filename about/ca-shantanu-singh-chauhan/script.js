// Contact information - Replace with your actual details
const contactInfo = {
    name: "CA. Shantanu Singh Chauhan",
    phone: "+917389968331", // Replace with your phone number (e.g., +919876543210)
    email: "cashantanu.schauhan@gmail.com", // Replace with your email
    website: "www.sschauhan.co.in", // Replace with your website
    address: "78, Awadhpuri, Gwarighat, Jabalpur, Madhya Pradesh, India 482008", // Replace with your address
    facebook: "https://www.facebook.com/shantanu.chauhan", // Replace with your Facebook URL
    instagram: "https://www.instagram.com/shantanu.chauhan27/", // Replace with your Instagram URL
    linkedin: "https://www.linkedin.com/in/shantanu-chauhan27/" // Replace with your LinkedIn URL
};

// Update action buttons with contact info
document.getElementById('whatsapp-btn').href = `https://wa.me/${contactInfo.phone.replace(/\D/g, '')}`;
document.getElementById('call-btn').href = `tel:${contactInfo.phone}`;
document.getElementById('directions-btn').href = `https://maps.app.goo.gl/V3GeYh22Je2F2QUD7`;

// Update social media links
document.querySelector('.facebook').href = contactInfo.facebook;
document.querySelector('.instagram').href = contactInfo.instagram;
document.querySelector('.linkedin').href = contactInfo.linkedin;

// VCF Download Function
function downloadVCF() {
    const vcfContent = `BEGIN:VCARD
VERSION:3.0
FN:${contactInfo.name}
N:Chauhan;Shantanu Singh;CA.;;
ORG:Chartered Accountant
TEL;TYPE=WORK,VOICE:${contactInfo.phone}
EMAIL:${contactInfo.email}
URL:${contactInfo.website}
ADR;TYPE=WORK:;;${contactInfo.address};;;;
END:VCARD`;

    const blob = new Blob([vcfContent], { type: 'text/vcard' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'CA_Shantanu_Singh_Chauhan.vcf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Add smooth animations on scroll for contact items
const observerOptions = {
    threshold: 0.1, // Trigger when 10% of the item is visible
    rootMargin: '0px 0px -50px 0px' // Reduce trigger area by 50px from bottom
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            observer.unobserve(entry.target); // Stop observing once animated
        }
    });
}, observerOptions);

// Initialize styles for animation and observe each contact item
document.querySelectorAll('.contact-item').forEach(item => {
    item.style.opacity = '0';
    item.style.transform = 'translateY(20px)';
    item.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(item);
});