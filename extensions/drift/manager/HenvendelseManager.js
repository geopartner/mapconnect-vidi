  /*
 * @author     Gunnar Jul Jensen <gjj@geopartner.dk>
 * @copyright  2026 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */
  
  export default class HenvendelseManager     {
    constructor(mapRef,
      backboneEvents,
      MODULE_NAME) {
        
      this.map = mapRef;
  
      this.backboneEvents = backboneEvents;
      this.MODULE_NAME = MODULE_NAME;
      
    }
  /*********************************************************************************************************************  
  * getLedningFilmfilAsync:  
  **********************************************************************************************************************/
  async getHenvendelser() {
    
    try {
      const url = `/api/extension/mapstatus/GetActiveHenvendelser`;
      const data = await this.fetchDataAsync(url);
      if (data && data.features && data.features.length > 0) {
        return data.features[0].properties.henvendelse;
      } else {
        console.warn("No henvendelse found");
        return [];
      }
    } catch (e) {
      console.error("Error in GetHenvendelser: " + e);
      return null;
    }
  }
  async fetchDataAsync(url) {

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    }

}