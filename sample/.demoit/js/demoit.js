/*
Copyright 2018 Google LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

class BaseHTMLElement extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    render() {
        return '';
    }

    connectedCallback() {
        this.shadowRoot.innerHTML = `<style>${this.constructor.styles}</style>${this.render()}`;
    }

    $(selector) {
        return this.shadowRoot.querySelector(selector);
    }

    $$(selector) {
        return this.shadowRoot.querySelectorAll(selector);
    }
}

class FakeWindow extends BaseHTMLElement {
    static get styles() {
        return `
        #main {
            font-size: 18px;
            padding: 2.1em 0 0 0;
            border-radius: 0.4em;
            background: #ddd;
            display: inline-block;
            position: relative;
            overflow: hidden;
            box-shadow: 0 0.25em 0.9em -0.1em rgba(0,0,0,.2);
            width: 100%;
            height: calc(100% - 40px);
            background-color: white;
        }

        #bar {
            display: block;
            box-sizing: border-box;
            height: 2.1em;
            position: absolute;
            top: 0;
            padding: 0.3em;
            width: 100%;
            background: linear-gradient(to bottom, #edeaed 0%, #dddfdd 100%);
            border-bottom: 2px solid #cbcbcb;
            border-radius: 0.4em 0.4em 0 0;
        }

        #title {
            font-size: 0.75em;
            display: inline-block;
            height: 1.6em;
            width: calc(100% - 6em);
            padding: 0.4em 0.4em 0 0.4em;
            color: black;
            text-align: left;
            overflow: hidden;
            white-space: nowrap;
            font-family: sans-serif;
        }

        i {
            display: inline-block;
            width: 13px;
            height: 13px;
            border-radius: 13px;
            margin: 0.4em 3px;
        }

        i:hover {
            filter: brightness(110%);
        }

        #red {background-color: rgb(255, 90, 82);}
        #yellow {background-color: rgb(230, 192, 41);}
        #green {background-color: rgb(82, 194, 43);}

        #main:not(:first-of-type) {
            margin-top: 5px;
        }

        .maximized {
            position: absolute !important;
            top: 1vw !important;
            left: 1vw !important;
            width: calc(100% - 2vw) !important;
            height: calc(100% - 2vw) !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            z-index: 20 !important;
        }`;
    }

    render() {
        this.title = this.getAttribute('title') || '';

        return `
        <div id="main">
            <div id="bar">
                <i id="red"></i><i id="yellow"></i><i id="green"></i>
                ${this.title ? `<span id="title">${this.title}</span>` : ''}
                <slot name="bar"></slot>
            </div>
            <slot></slot>
        </div>`;
    }

    connectedCallback() {
        super.connectedCallback();
        this.$('#green').addEventListener('click', () => this.$('#main').classList.toggle('maximized'));
    }
}

customElements.define('fake-window', FakeWindow);

class SourceCode extends BaseHTMLElement {
    static get styles() {
        return `
        #container {
            height: calc(100% - 42px);
            overflow-y: scroll;
            overflow-x: hidden;
        }

        .chroma {
            text-align: left;
            color: #212121;
            padding: 0;
            padding-bottom: 0px;
            margin: 0;
            font-size: var(--source-code-font-size, 16px);
            font-family: 'Roboto Mono', monospace;
        }
        
        pre.chroma {
            tab-size: var(--source-code-tab-size, 4);
        }
        
        .nt {
            color: blue;
        }
        
        #tabs {
            background-color: rgb(243, 243, 243);
            border-bottom: 1.5px solid rgb(236, 236, 236);
            overflow: hidden; 
            text-overflow: ellipsis;
            white-space: nowrap;
            text-align: left;
            height: 42px;
        }
        
        #tabs a {
            display: inline-block;
            line-height: 42px;
            padding: 0 15px 0 20px;
            background: rgb(236, 236, 236);
            text-decoration: none !important;
            color: black;
            font-size: 0.9em;
            font-family: sans-serif;
        }
        
        #tabs a .close {
            visibility: hidden;
            margin-left: 10px;
            font-weight: bold;
        }
        
        #tabs a.selected .close {
            visibility: visible;
        }
        
        #tabs a.selected {
            background: white;
        }

        #source {
            --default-color-selection: rgb(191, 214, 255);
        }
        
        .hl {
            background-color: var(--color-selection, var(--default-color-selection)) !important;
        }`;
    }

    render() {
        this.folder = this.getAttribute('folder');
        this.files = this.getAttribute('files').split(' ').filter(n => n.trim() !== '');
        this.startLines = this.getAttribute('start-lines').split(';');
        this.endLines = this.getAttribute('end-lines').split(';');

        return `
        <fake-window title="code ~ ${this.folder}">
            <div id="tabs">
            ${this.files.map((file, i) => `<a class="${(i == 0) ? 'selected' : ''}" href="#">${file}<span class="close">x</span></a>`).join('')}
            </div>
            <div id="container">
                <div id="source"></div>
            </div>
        </fake-window>`;
    }

    connectedCallback() {
        super.connectedCallback();
        this.showCurrentTab(0);
        this.$$('a').forEach((link, index) => link.addEventListener('click', () => {
            this.showCurrentTab(index);
        }));
    }

    async showCurrentTab(current) {
        const file = this.files[current];
        const startLines = this.startLines[current];
        const endLines = this.endLines[current];
        const url = `/sourceCode/${this.folder}/${file}?style=vs&startLine=${startLines}&endLine=${endLines}`;

        const response = await fetch(url);
        this.$('#source').innerHTML = await response.text();

        this.$$('a').forEach((link, index) => link.classList.toggle('selected', index == current));
    }
}

customElements.define('source-code', SourceCode);

class WebBrowser extends BaseHTMLElement {
    static get styles() {
        return `
        input {
            font-size: 0.75em;
            vertical-align: top;
            height: 1.6em;
            width: calc(100% - 10em);
            border: 0.1em solid #E1E1E1;
            border-radius: 0.25em;
            margin: 0.1em;
            padding: 0 0.4em;
        }
        
        #refresh img {
            height: 0.8em;
            margin-bottom: 3px;
            padding: 3px;
            cursor: default;
        }
        
        #chrome img {
            height: 1em;
            margin-bottom: 3px;
            padding: 3px;
        }
        
        #refresh img:hover, #chrome img:hover {
            background-color: lightgray;
            border-radius: 4px;
        }
        
        iframe {
            width: 100%;
            height: calc(100% + 1px);
            border: none;
        }`;
    }

    render() {
        this.src = this.getAttribute('src');

        return `
        <fake-window>
            <span slot="bar">
                <a id="refresh" href="#"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABsAAAAbCAYAAACN1PRVAAAKqmlDQ1BJQ0MgUHJvZmlsZQAASImVlgdUk8kWx+f7vvRCS4iAlNCb9BZAeg1dOtgISYBQYkgIAnZFXMG1ICICiiKLIAquSpG1IKLYFkXFrguyKKjrYsGGyvuAR9x977z3zrvn3Mzv3Ny5c2e+mXP+AFDuckSidFgBgAxhljjcz5MZGxfPxD8BMMADCsAAKocrEXmEhQUB1GbGv9v72wCaHG+aTdb69///qyny+BIuAFAYyok8CTcD5eOod3BF4iwAENSB7tIs0SSXoUwXow2ifGiSk6e5Y5ITp/nWVE5kuBfKwwAQKByOOBkA8js0zszmJqN1KHSULYU8gRBlb5RduSkcHsr5KM/JyFgyyUdQNkr8S53kv9VMlNXkcJJlPL2XKSN4CySidE7u/3kc/9sy0qUza+iiTkkR+4dPjpPnlrYkUMbCxJDQGRbwpvKnOEXqHzXDXIlX/AzzON6BsrnpIUEznCTwZcvqZLEjZ1i8JFxWny/xiZhhjvj7WtK0KA/Zuny2rGZeSmTMDGcLokNmWJIWEfg9x0sWF0vDZT0niX1le8yQ/GVfArYsPysl0l+2R8733viSWFkPPL63jywujJLliLI8ZfVF6WGyfH66nywuyY6Qzc1CL9v3uWGy80nlBITNMPAENsAa2AN/EJjFz5m808BriShXLEhOyWJ6oK+Gz2QLueZzmNaWViwAJt/g9Cd+y5h6WxDj8veY6DEArEQ0iHyPJaBvpq0IfU6j32P66H2VpwHQ4ciVirOnY5jJHywgAXlAB6pAE71DRsBsqjdn4A58QAAIBZEgDiwCXJACMoAYLAXLwRpQAIrAVrADlIMqsB/UgcPgKGgFJ8FZcAFcAddBH3gA+sEQeAFGwXswDkEQHqJCNEgV0oL0IVPIGmJBrpAPFASFQ3FQApQMCSEptBxaBxVBxVA5tA+qh36GTkBnoUtQL3QPGoBGoDfQZxiBKTAd1oANYAuYBXvAgXAkvBBOhjPhPDgf3gyXwdXwIbgFPgtfgfvgfvgFPIYAhIwwEG3EDGEhXkgoEo8kIWJkJVKIlCLVSCPSjnQjN5F+5CXyCYPD0DBMjBnGGeOPicJwMZmYlZhNmHJMHaYF04W5iRnAjGK+YalYdawp1gnLxsZik7FLsQXYUmwtthl7HtuHHcK+x+FwDJwhzgHnj4vDpeKW4TbhduOacB24XtwgbgyPx6viTfEu+FA8B5+FL8Dvwh/Cn8HfwA/hPxLIBC2CNcGXEE8QEtYSSgkHCacJNwjPCONEBaI+0YkYSuQRc4lbiDXEduI14hBxnKRIMiS5kCJJqaQ1pDJSI+k86SHpLZlM1iE7kueRBeTV5DLyEfJF8gD5E0WJYkLxoiygSCmbKQcoHZR7lLdUKtWA6k6Np2ZRN1Prqeeoj6kf5Why5nJsOZ7cKrkKuRa5G3Kv5Iny+vIe8ovk8+RL5Y/JX5N/qUBUMFDwUuAorFSoUDihcEdhTJGmaKUYqpihuEnxoOIlxWElvJKBko8STylfab/SOaVBGkLTpXnRuLR1tBraedoQHUc3pLPpqfQi+mF6D31UWUnZVjlaOUe5QvmUcj8DYRgw2Ix0xhbGUcZtxudZGrM8ZvFnbZzVOOvGrA8qs1XcVfgqhSpNKn0qn1WZqj6qaarbVFtVH6lh1EzU5qktVdujdl7t5Wz6bOfZ3NmFs4/Ovq8Oq5uoh6svU9+vflV9TENTw09DpLFL45zGS02GprtmqmaJ5mnNES2alquWQKtE64zWc6Yy04OZzixjdjFHtdW1/bWl2vu0e7THdQx1onTW6jTpPNIl6bJ0k3RLdDt1R/W09IL1lus16N3XJ+qz9FP0d+p3638wMDSIMdhg0GowbKhiyDbMM2wwfGhENXIzyjSqNrpljDNmGacZ7za+bgKb2JmkmFSYXDOFTe1NBaa7TXvnYOc4zhHOqZ5zx4xi5mGWbdZgNmDOMA8yX2veav7KQs8i3mKbRbfFN0s7y3TLGssHVkpWAVZrrdqt3libWHOtK6xv2VBtfG1W2bTZvLY1teXb7rG9a0ezC7bbYNdp99XewV5s32g/4qDnkOBQ6XCHRWeFsTaxLjpiHT0dVzmedPzkZO+U5XTU6U9nM+c054POw3MN5/Ln1swddNFx4bjsc+l3ZbomuO517XfTduO4Vbs9cdd157nXuj/zMPZI9Tjk8crT0lPs2ez5wcvJa4VXhzfi7edd6N3jo+QT5VPu89hXxzfZt8F31M/Ob5lfhz/WP9B/m/8dtgaby65njwY4BKwI6AqkBEYElgc+CTIJEge1B8PBAcHbgx+G6IcIQ1pDQSg7dHvoozDDsMywX+bh5oXNq5j3NNwqfHl4dwQtYnHEwYj3kZ6RWyIfRBlFSaM6o+WjF0TXR3+I8Y4pjumPtYhdEXslTi1OENcWj4+Pjq+NH5vvM3/H/KEFdgsKFtxeaLgwZ+GlRWqL0hedWiy/mLP4WAI2ISbhYMIXTiinmjOWyE6sTBzlenF3cl/w3HklvBG+C7+Y/yzJJak4aTjZJXl78kiKW0ppykuBl6Bc8DrVP7Uq9UNaaNqBtIn0mPSmDEJGQsYJoZIwTdi1RHNJzpJekamoQNSf6ZS5I3NUHCiulUCShZK2LDoqdq5KjaTrpQPZrtkV2R+XRi89lqOYI8y5mmuSuzH3WZ5v3k/LMMu4yzqXay9fs3xghceKfSuhlYkrO1fprspfNbTab3XdGtKatDW/rrVcW7z23bqYde35Gvmr8wfX+61vKJArEBfc2eC8oeoHzA+CH3o22mzctfFbIa/wcpFlUWnRl03cTZd/tPqx7MeJzUmbe7bYb9mzFbdVuPX2NrdtdcWKxXnFg9uDt7eUMEsKS97tWLzjUqltadVO0k7pzv6yoLK2XXq7tu76Up5S3lfhWdFUqV65sfLDbt7uG3vc9zRWaVQVVX3eK9h7d5/fvpZqg+rS/bj92fuf1kTXdP/E+qm+Vq22qPbrAeGB/rrwuq56h/r6g+oHtzTADdKGkUMLDl0/7H24rdGscV8To6noCDgiPfL854Sfbx8NPNp5jHWs8bj+8cpmWnNhC9SS2zLamtLa3xbX1nsi4ERnu3N78y/mvxw4qX2y4pTyqS2nSafzT0+cyTsz1iHqeHk2+exg5+LOB+diz93qmtfVcz7w/MULvhfOdXt0n7nocvHkJadLJy6zLrdesb/SctXuavOvdr8299j3tFxzuNZ23fF6e+/c3tM33G6cvel988It9q0rfSF9vbejbt+9s+BO/13e3eF76fde38++P/5g9UPsw8JHCo9KH6s/rv7N+Lemfvv+UwPeA1efRDx5MMgdfPG75PcvQ/lPqU9Ln2k9qx+2Hj454jty/fn850MvRC/GXxb8ofhH5SujV8f/dP/z6mjs6NBr8euJN5veqr498M72XedY2Njj9xnvxz8UflT9WPeJ9an7c8znZ+NLv+C/lH01/tr+LfDbw4mMiQkRR8yZkgII6nBSEgBvDgBAjQOAdh0A0vxpjTxl0LSunyLwn3haR0+ZPQB1qwGYlGrB6Lh3UoN0ACCH8qQUinQHsI2NzP9pkiQb6+laFFQ5Yj9OTLzVAADfDsBX8cTE+O6Jia81aLP3UB2TOa3Np3QMmotRkFg22vY1O2uDf7F/ANi4BUoBnFTDAAAACXBIWXMAABYlAAAWJQFJUiTwAAAEJGlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS40LjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyIKICAgICAgICAgICAgeG1sbnM6ZXhpZj0iaHR0cDovL25zLmFkb2JlLmNvbS9leGlmLzEuMC8iCiAgICAgICAgICAgIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIKICAgICAgICAgICAgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIj4KICAgICAgICAgPHRpZmY6UmVzb2x1dGlvblVuaXQ+MjwvdGlmZjpSZXNvbHV0aW9uVW5pdD4KICAgICAgICAgPHRpZmY6Q29tcHJlc3Npb24+NTwvdGlmZjpDb21wcmVzc2lvbj4KICAgICAgICAgPHRpZmY6WFJlc29sdXRpb24+MTQ0PC90aWZmOlhSZXNvbHV0aW9uPgogICAgICAgICA8dGlmZjpPcmllbnRhdGlvbj4xPC90aWZmOk9yaWVudGF0aW9uPgogICAgICAgICA8dGlmZjpZUmVzb2x1dGlvbj4xNDQ8L3RpZmY6WVJlc29sdXRpb24+CiAgICAgICAgIDxleGlmOlBpeGVsWERpbWVuc2lvbj4yNzwvZXhpZjpQaXhlbFhEaW1lbnNpb24+CiAgICAgICAgIDxleGlmOkNvbG9yU3BhY2U+MTwvZXhpZjpDb2xvclNwYWNlPgogICAgICAgICA8ZXhpZjpQaXhlbFlEaW1lbnNpb24+Mjc8L2V4aWY6UGl4ZWxZRGltZW5zaW9uPgogICAgICAgICA8ZGM6c3ViamVjdD4KICAgICAgICAgICAgPHJkZjpTZXEvPgogICAgICAgICA8L2RjOnN1YmplY3Q+CiAgICAgICAgIDx4bXA6TW9kaWZ5RGF0ZT4yMDE4OjAyOjE5IDA5OjAyOjcxPC94bXA6TW9kaWZ5RGF0ZT4KICAgICAgICAgPHhtcDpDcmVhdG9yVG9vbD5QaXhlbG1hdG9yIDMuNzwveG1wOkNyZWF0b3JUb29sPgogICAgICA8L3JkZjpEZXNjcmlwdGlvbj4KICAgPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KMST8RQAABE9JREFUSA2tVttLm1kQP/lIvVCrpklTEy3xQiXR0tiIWguVmm53NaGFIn0SKdhSN0ih/4D4VGixbyr7oD6smycFpV0v2YfGLu0WFFZNQdMLXlIkSnMx6e5Spdb0Nx+e8FWTELc5cDhzZubMb86c+WY+WTgc/jUnJ+cmizM8Hk/E7XazhYUFtr29zdbX10VNjUbD0tPTWXl5OTMYDEyn08nimBDZAwMDERnAGgE2yRX9fr9eLpffXllZ+dnpdB5dXV3looRrYWEhs1qtETgxDMU/I5GITxAEHWjL8PBw/fz8PDvgTSgU+mFsbOze9PS0NYb1jzDygfgymUyNJXu/Tm1t7SpA/wLfB52CoaGhyy6XS0F634BtbGycsdvtdxG6OxIjQaPR+LS4uPhFXl7efH5+vpdkXq+3APoVi4uLlxDmn2A4g5+hsDY1NTE4zehGfIhge6Er6O/vvyEF0uv1dovFYi8qKvqDH9i/4i3TsrKybiJUNpw9x+X0nvTG0iGCIXSP4IWehw6hCiMUDxobGx9COSI9EI+GjVtzc3P3R0ZGTsbTEUhAycCBaL8H9ABkUkB0BsNpMplclCjxhpwElHVcgUK3dyPOSmrd3d0Njo6OhhJlr0DfEVdA+AL0RrB+mBuJzuDNjiCM/yXyTEA2ReUVFRXORMkQVYxBtLW1+ZGRs3DYCXEohgqTS8EovWMpJcvr7u7uaW9vfwlAHYCP45wC9CnQ5zAvyre2tkRbYIbpO0rWcDy93t7eWchoRkcgEChHVbIJ+DA508c/WM5I1apUKheQQH1i6pNRXBOXixw6MZJ1SKFQuASEjusr1tbWohvOTOUqZGRES5rK5/MZUml8vy2hrKwsyltaWjJGNykmNjc3dXICm5iYEE2jFRiWl5fP4hN49b1Yzc3N2ZmZmdnolx/QYHeQDqcE6rCSeqaZnJy8/L1APT09Nbm5uS0AM1dXV+ttNtsJNNIMMRvNZvMbIL/F/ILeZMJNf/y/gOgeF2DjGrJbDxvpdXV1/6BwBLD/KIKhRP1WU1PzBMK3mMfHx8etmFcOCwgnzQ6H4zr9DsDxUFVV1RzsrtTX1++geHjEfoYs1KLZHevr66vFm52HF9Ty/ei4fzc0NDhLSkreJQJGYp0GiJmigrNUpt6r1erfOzo6nknPiWBSRldX11V0gis4dBp8AR6uI4ncpaWlLq1W66Y96eM9NKg+BoTIiNZvgL4Gsi9Y36hUqrHOzs6nUrtEHwAj5uDgoGVmZuYqSBOmCgY+wxD96HhBB7Ey7OkGWuzVoI+A9mPOImyPW1paHKAPDLF57ucilI7W1lbl1NSUEl1cBWNUxUug9wlTrNzYUzXIhGwHqxfv7sHbvES3jgkEHUb/jdX4b5yhjXTgI7yEh76Gf4uLCJUeM4s6BC/caWlpDGFlAPm3srLyNVL9OYrtE9TAZ1I7nA4Gg2cYwH7BrOJMrDIIzkr2KSO/Ahq57IDO8l6eAAAAAElFTkSuQmCC"></a>
                <input id="url" value="${this.src}" />
                <a id="chrome" href="${this.src}" target="_blank"><img src="data:image/png;base64,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"></a>
            </span>

            <iframe id="site" class="site" src="${this.src}?rnd=${Math.random(1)}"></iframe>
        </fake-window>`;
    }

    connectedCallback() {
        super.connectedCallback();

        this.$('#refresh').addEventListener('click', () => this.reset());
        this.$('#url').addEventListener('keydown', (event) => {
            event.stopPropagation();
            if (event.key === 'Enter') {
                this.reset();
            }
        });

        this.reset();
    }

    async reset() {
        window.clearInterval(this.timer);

        this.previousStatus = -1;
        await this.refreshFrame();

        this.timer = window.setInterval(() => this.refreshFrame(), 1000);
    }

    async refreshFrame() {
        const url = this.$('#url').value;
        const response = await fetch(`/ping?url=${url}`, { method: 'HEAD' });

        const status = response.status;
        if (status == this.previousStatus) {
            return;
        }
        this.previousStatus = status;

        if (status < 400) {
            window.clearInterval(this.timer);
            this.$('#site').src = url;
            return
        }

        this.$('#site').src = url + `?rnd=${Math.random(1)}`;
    }
}

customElements.define('web-browser', WebBrowser);

class WebTerm extends BaseHTMLElement {
    static get styles() {
        return `
        :host {
            display: flex;
            flex-direction: column;
            height: 100%;
        }

        fake-window {
            flex: 1;
        }

        fake-window:not(:first-of-type) {
            margin-top: 5px;
        }

        iframe {
            width: calc(100% + 1px);
            height: calc(100% + 1px);
            border: none;
            background-color: rgb(10,39,50);
        }
        
        .newtab {
            position: absolute;
            top: 6px;
            right: 10px;
            color: #AAAAAA;
            font-size: 1.1em;
            text-decoration: none;
            font-family: sans-serif;
        }`
    }

    render() {
        this.path = this.getAttribute('path');

        return '';
    }

    connectedCallback() {
        super.connectedCallback();
        this.addTab();
    }

    addTab() {
        const div = document.createElement('div');
        div.innerHTML = `
        <fake-window title="bash ~ ${this.path}">
            <a slot="bar" class="newtab" href="#">+</a>
            <iframe scrolling="no" src="/shell/${this.path}"></iframe>
        </fake-window>`;

        const window = this.shadowRoot.appendChild(div.lastChild);
        window.querySelector('.newtab').addEventListener('click', () => this.addTab());
    }
}

customElements.define('web-term', WebTerm);

class SplitView extends BaseHTMLElement {
    static get styles() {
        return `
        :host {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
            grid-template-rows: 100%;
            column-gap: 1vw;
        }`;
    }

    render() {
        return `<slot></slot>`;
    }
}

customElements.define('split-view', SplitView);

class NavArrows extends BaseHTMLElement {
    static get styles() {
        return `
        :host {
            position: absolute;
            bottom: 10px;
            right: 10px;
            width: 85px;
            height: 40px;
            z-index: 30;
            font-family: sans-serif !important;
            font-size: 16px !important;
        }

        a {
            display: inline-block;
            visibility: hidden;
            background-color: black;
            opacity: .4;
            width: 40px;
            text-align: center;
            font-weight: bold;
            line-height: 40px;
            border-radius: 20px;
            color: white;
            cursor: pointer;
            box-shadow: 0 1px 1px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23);
        }

        :host(:hover) a:not(.disabled) {
            visibility: visible;
        }`;
    }

    render() {
        this.previous = this.getAttribute('previous');
        this.next = this.getAttribute('next');

        return `
        <a class="${this.previous ? '' : 'disabled'}" onclick="window.location.href='${this.previous}';">&lt;</a>
        <a class="${this.next ? '' : 'disabled'}" onclick="window.location.href='${this.next}';">&gt;</a>`;
    }

    connectedCallback() {
        super.connectedCallback();

        // Capture keydown events, and change slides accordingly
        document.addEventListener('keydown', event => {
            switch (event.key) {
                case 'ArrowRight':
                case 'PageDown':
                case ' ':
                    window.location.href = this.next;
                    break;
                case 'ArrowLeft':
                case 'PageUp':
                    window.location.href = this.previous;
                    break;
                default:
                    return;
            }
        });
    }
}

customElements.define('nav-arrows', NavArrows);
