  /*
 * @author     Gunnar Jul Jensen <gjj@geopartner.dk>
 * @copyright  2026 Geopartner Landinspektører A/S
 * @license    http://www.gnu.org/licenses/#AGPL  GNU AFFERO GENERAL PUBLIC LICENSE 3
 */

  import Henvendelse from "./Henvendelse.js";
  
  export default class HenvendelseManager     {
    constructor(mapRef,
      backboneEvents,
      MODULE_NAME) {
        
      this.map = mapRef;
  
      this.backboneEvents = backboneEvents;
      this.MODULE_NAME = MODULE_NAME;

      /** @type {Henvendelse[]} */
      this.henvendelser = [];
      this.pageSizeOptions = [10, 25, 50, 100];
      this.pageSize = 25;
      this.page = 0;
    }
  /*********************************************************************************************************************
  * Pagination
  **********************************************************************************************************************/
  getPageCount() {
    return Math.max(1, Math.ceil(this.henvendelser.length / this.pageSize));
  }

  getCurrentPage() {
    const start = this.page * this.pageSize;
    return this.henvendelser.slice(start, start + this.pageSize);
  }

  getPagination() {
    const total = this.henvendelser.length;
    const from = total === 0 ? 0 : this.page * this.pageSize + 1;
    return {
      page: this.page,
      pageCount: this.getPageCount(),
      pageSize: this.pageSize,
      pageSizeOptions: this.pageSizeOptions,
      total: total,
      from: from,
      to: Math.min(total, (this.page + 1) * this.pageSize),
    };
  }

  goToPage(page) {
    this.page = Math.min(Math.max(0, page), this.getPageCount() - 1);
    return this.getCurrentPage();
  }

  firstPage() {
    return this.goToPage(0);
  }

  prevPage() {
    return this.goToPage(this.page - 1);
  }

  nextPage() {
    return this.goToPage(this.page + 1);
  }

  lastPage() {
    return this.goToPage(this.getPageCount() - 1);
  }

  setPageSize(size) {
    const n = parseInt(size, 10);
    if (!Number.isFinite(n) || n <= 0) {
      return this.getCurrentPage();
    }
    // Keep the first visible row on screen after changing page size
    const firstRow = this.page * this.pageSize;
    this.pageSize = n;
    return this.goToPage(Math.floor(firstRow / n));
  }
  /*********************************************************************************************************************  
  * getLedningFilmfilAsync:  
  **********************************************************************************************************************/
  async getHenvendelser() {
    
    try {
      const url = `/api/extension/drift/GetActiveHenvendelser`;
      const data = await this.fetchDataAsync(url);
      if (data && data.features && data.features.length > 0) {
        this.henvendelser = data.features.map(Henvendelse.fromFeature);
      } else {
        console.warn("No henvendelse found");
        this.henvendelser = [];
      }
      this.page = 0;
      return this.henvendelser;
    } catch (e) {
      console.error("Error in GetHenvendelser: " + e);
      this.henvendelser = [];
      this.page = 0;
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