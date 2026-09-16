// This element contains the styling for the module
var styleObject = {
  selectedLedning: {
    color: "#AA4A44",
    weight: 8,
  },
 
  selectedPoint: {
    html: `
    <svg width="24" height="24" viewBox="-12 -12 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke-linecap="round">
    <g stroke="#c5c9d0" stroke-width="4" opacity="0.4">
    <line x1="-8" y1="-8" x2="8" y2="8" />
    <line x1="-8" y1="8" x2="8" y2="-8" />
  </g>
  <g stroke="#0b0b0b" stroke-width="2">
    <line x1="-8" y1="-8" x2="8" y2="8" />
    <line x1="-8" y1="8" x2="8" y2="-8" />
  </g>
</svg>
    `,
    className: "",
    iconSize: [24, 24], // size of the icon
    //iconAnchor: [-10, -10], // point of the icon which will correspond to marker's location
  },

  alarmPosition: {
    html: `
    <svg fill="#2a2a2a" opacity="0.7" width="24px" height="24px" viewBox="0 0 57.6 57.6" xmlns="http://www.w3.org/2000/svg">
    <path d="M28.709 0c-10.872 0 -19.71 8.838 -19.71 19.706 0 5.418 2.408 10.436 7.362 15.347 7.193 7.139 10.548 13.73 10.548 20.747v1.8h3.6v-1.8c0 -6.984 3.308 -13.385 10.728 -20.743 4.954 -4.914 7.362 -9.932 7.362 -15.35 0 -10.868 -8.838 -19.706 -19.89 -19.706" fill-rule="evenodd"/>
    </svg>
    `,
    className: "",
    iconSize: [24, 24], // size of the icon
    iconAnchor: [12, 24], // point of the icon which will correspond to marker's location
  },
};

module.exports = styleObject;