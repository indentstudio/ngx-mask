import { Inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { config } from './config';
import { MaskApplierService } from './mask-applier.service';
import * as i0 from "@angular/core";
export class MaskService extends MaskApplierService {
    constructor(document, _config, _elementRef, _renderer) {
        super(_config);
        this.document = document;
        this._config = _config;
        this._elementRef = _elementRef;
        this._renderer = _renderer;
        this.maskExpression = '';
        this.isNumberValue = false;
        this.placeHolderCharacter = '_';
        this.maskIsShown = '';
        this.selStart = null;
        this.selEnd = null;
        /**
         * Whether we are currently in writeValue function, in this case when applying the mask we don't want to trigger onChange function,
         * since writeValue should be a one way only process of writing the DOM value based on the Angular model value.
         */
        this.writingValue = false;
        this.maskChanged = false;
        this.triggerOnMaskChange = false;
        this.onChange = (_) => { };
    }
    // eslint-disable-next-line complexity
    applyMask(inputValue, maskExpression, position = 0, justPasted = false, backspaced = false, cb = () => { }) {
        if (!maskExpression) {
            return inputValue !== this.actualValue ? this.actualValue : inputValue;
        }
        this.maskIsShown = this.showMaskTyped ? this.showMaskInInput() : '';
        if (this.maskExpression === 'IP' && this.showMaskTyped) {
            this.maskIsShown = this.showMaskInInput(inputValue || '#');
        }
        if (this.maskExpression === 'CPF_CNPJ' && this.showMaskTyped) {
            this.maskIsShown = this.showMaskInInput(inputValue || '#');
        }
        if (!inputValue && this.showMaskTyped) {
            this.formControlResult(this.prefix);
            return this.prefix + this.maskIsShown;
        }
        const getSymbol = !!inputValue && typeof this.selStart === 'number' ? inputValue[this.selStart] : '';
        let newInputValue = '';
        if (this.hiddenInput !== undefined && !this.writingValue) {
            let actualResult = this.actualValue.split('');
            // eslint-disable  @typescript-eslint/no-unused-expressions
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            inputValue !== '' && actualResult.length
                ? typeof this.selStart === 'number' && typeof this.selEnd === 'number'
                    ? inputValue.length > actualResult.length
                        ? actualResult.splice(this.selStart, 0, getSymbol)
                        : inputValue.length < actualResult.length
                            ? actualResult.length - inputValue.length === 1
                                ? actualResult.splice(this.selStart - 1, 1)
                                : actualResult.splice(this.selStart, this.selEnd - this.selStart)
                            : null
                    : null
                : (actualResult = []);
            if (this.showMaskTyped) {
                // eslint-disable-next-line no-param-reassign
                inputValue = this.removeMask(inputValue);
            }
            // eslint-enable  @typescript-eslint/no-unused-expressions
            newInputValue =
                this.actualValue.length && actualResult.length <= inputValue.length
                    ? this.shiftTypedSymbols(actualResult.join(''))
                    : inputValue;
        }
        if (this.showMaskTyped) {
            // eslint-disable-next-line no-param-reassign
            inputValue = this.removeMask(inputValue);
        }
        newInputValue = Boolean(newInputValue) && newInputValue.length ? newInputValue : inputValue;
        const result = super.applyMask(newInputValue, maskExpression, position, justPasted, backspaced, cb);
        this.actualValue = this.getActualValue(result);
        // handle some separator implications:
        // a.) adjust decimalMarker default (. -> ,) if thousandSeparator is a dot
        if (this.thousandSeparator === '.' && this.decimalMarker === '.') {
            this.decimalMarker = ',';
        }
        // b) remove decimal marker from list of special characters to mask
        if (this.maskExpression.startsWith('separator') && this.dropSpecialCharacters === true) {
            this.maskSpecialCharacters = this.maskSpecialCharacters.filter((item) => !this._compareOrIncludes(item, this.decimalMarker, this.thousandSeparator));
        }
        this.formControlResult(result);
        if (!this.showMaskTyped) {
            if (this.hiddenInput) {
                return result && result.length ? this.hideInput(result, this.maskExpression) : result;
            }
            return result;
        }
        const resLen = result.length;
        const prefNmask = this.prefix + this.maskIsShown;
        if (this.maskExpression.includes('H')) {
            const countSkipedSymbol = this._numberSkipedSymbols(result);
            return result + prefNmask.slice(resLen + countSkipedSymbol);
        }
        else if (this.maskExpression === 'IP' || this.maskExpression === 'CPF_CNPJ') {
            return result + prefNmask;
        }
        return result + prefNmask.slice(resLen);
    }
    // get the number of characters that were shifted
    _numberSkipedSymbols(value) {
        const regex = /(^|\D)(\d\D)/g;
        let match = regex.exec(value);
        let countSkipedSymbol = 0;
        while (match != null) {
            countSkipedSymbol += 1;
            match = regex.exec(value);
        }
        return countSkipedSymbol;
    }
    applyValueChanges(position, justPasted, backspaced, cb = () => { }) {
        const formElement = this._elementRef.nativeElement;
        formElement.value = this.applyMask(formElement.value, this.maskExpression, position, justPasted, backspaced, cb);
        if (formElement === this._getActiveElement()) {
            return;
        }
        this.clearIfNotMatchFn();
    }
    hideInput(inputValue, maskExpression) {
        return inputValue
            .split('')
            .map((curr, index) => {
            if (this.maskAvailablePatterns &&
                this.maskAvailablePatterns[maskExpression[index]] &&
                this.maskAvailablePatterns[maskExpression[index]]?.symbol) {
                return this.maskAvailablePatterns[maskExpression[index]]?.symbol;
            }
            return curr;
        })
            .join('');
    }
    // this function is not necessary, it checks result against maskExpression
    getActualValue(res) {
        const compare = res
            .split('')
            .filter((symbol, i) => this._checkSymbolMask(symbol, this.maskExpression[i]) ||
            (this.maskSpecialCharacters.includes(this.maskExpression[i]) &&
                symbol === this.maskExpression[i]));
        if (compare.join('') === res) {
            return compare.join('');
        }
        return res;
    }
    shiftTypedSymbols(inputValue) {
        let symbolToReplace = '';
        const newInputValue = (inputValue &&
            inputValue.split('').map((currSymbol, index) => {
                if (this.maskSpecialCharacters.includes(inputValue[index + 1]) &&
                    inputValue[index + 1] !== this.maskExpression[index + 1]) {
                    symbolToReplace = currSymbol;
                    return inputValue[index + 1];
                }
                if (symbolToReplace.length) {
                    const replaceSymbol = symbolToReplace;
                    symbolToReplace = '';
                    return replaceSymbol;
                }
                return currSymbol;
            })) ||
            [];
        return newInputValue.join('');
    }
    /**
     * Convert number value to string
     * 3.1415 -> '3.1415'
     * 1e-7 -> '0.0000001'
     */
    numberToString(value) {
        if (!value && value !== 0) {
            return String(value);
        }

        return Number(value).toLocaleString('en-US', {
            useGrouping: false,
            maximumFractionDigits: 20,
        });
    }
    showMaskInInput(inputVal) {
        if (this.showMaskTyped && !!this.shownMaskExpression) {
            if (this.maskExpression.length !== this.shownMaskExpression.length) {
                throw new Error('Mask expression must match mask placeholder length');
            }
            else {
                return this.shownMaskExpression;
            }
        }
        else if (this.showMaskTyped) {
            if (inputVal) {
                if (this.maskExpression === 'IP') {
                    return this._checkForIp(inputVal);
                }
                if (this.maskExpression === 'CPF_CNPJ') {
                    return this._checkForCpfCnpj(inputVal);
                }
            }
            return this.maskExpression.replace(/\w/g, this.placeHolderCharacter);
        }
        return '';
    }
    clearIfNotMatchFn() {
        const formElement = this._elementRef.nativeElement;
        if (this.clearIfNotMatch &&
            this.prefix.length + this.maskExpression.length + this.suffix.length !==
                formElement.value.replace(/_/g, '').length) {
            this.formElementProperty = ['value', ''];
            this.applyMask(formElement.value, this.maskExpression);
        }
    }
    set formElementProperty([name, value]) {
        Promise.resolve().then(() => this._renderer.setProperty(this._elementRef.nativeElement, name, value));
    }
    checkSpecialCharAmount(mask) {
        const chars = mask.split('').filter((item) => this._findSpecialChar(item));
        return chars.length;
    }
    removeMask(inputValue) {
        return this._removeMask(this._removeSuffix(this._removePrefix(inputValue)), this.maskSpecialCharacters.concat('_').concat(this.placeHolderCharacter));
    }
    _checkForIp(inputVal) {
        if (inputVal === '#') {
            return `${this.placeHolderCharacter}.${this.placeHolderCharacter}.${this.placeHolderCharacter}.${this.placeHolderCharacter}`;
        }
        const arr = [];
        for (let i = 0; i < inputVal.length; i++) {
            if (inputVal[i]?.match('\\d')) {
                arr.push(inputVal[i]);
            }
        }
        if (arr.length <= 3) {
            return `${this.placeHolderCharacter}.${this.placeHolderCharacter}.${this.placeHolderCharacter}`;
        }
        if (arr.length > 3 && arr.length <= 6) {
            return `${this.placeHolderCharacter}.${this.placeHolderCharacter}`;
        }
        if (arr.length > 6 && arr.length <= 9) {
            return this.placeHolderCharacter;
        }
        if (arr.length > 9 && arr.length <= 12) {
            return '';
        }
        return '';
    }
    _checkForCpfCnpj(inputVal) {
        const cpf = `${this.placeHolderCharacter}${this.placeHolderCharacter}${this.placeHolderCharacter}` +
            `.${this.placeHolderCharacter}${this.placeHolderCharacter}${this.placeHolderCharacter}` +
            `.${this.placeHolderCharacter}${this.placeHolderCharacter}${this.placeHolderCharacter}` +
            `-${this.placeHolderCharacter}${this.placeHolderCharacter}`;
        const cnpj = `${this.placeHolderCharacter}${this.placeHolderCharacter}` +
            `.${this.placeHolderCharacter}${this.placeHolderCharacter}${this.placeHolderCharacter}` +
            `.${this.placeHolderCharacter}${this.placeHolderCharacter}${this.placeHolderCharacter}` +
            `/${this.placeHolderCharacter}${this.placeHolderCharacter}${this.placeHolderCharacter}${this.placeHolderCharacter}` +
            `-${this.placeHolderCharacter}${this.placeHolderCharacter}`;
        if (inputVal === '#') {
            return cpf;
        }
        const arr = [];
        for (let i = 0; i < inputVal.length; i++) {
            if (inputVal[i]?.match('\\d')) {
                arr.push(inputVal[i]);
            }
        }
        if (arr.length <= 3) {
            return cpf.slice(arr.length, cpf.length);
        }
        if (arr.length > 3 && arr.length <= 6) {
            return cpf.slice(arr.length + 1, cpf.length);
        }
        if (arr.length > 6 && arr.length <= 9) {
            return cpf.slice(arr.length + 2, cpf.length);
        }
        if (arr.length > 9 && arr.length < 11) {
            return cpf.slice(arr.length + 3, cpf.length);
        }
        if (arr.length === 11) {
            return '';
        }
        if (arr.length === 12) {
            if (inputVal.length === 17) {
                return cnpj.slice(16, cnpj.length);
            }
            return cnpj.slice(15, cnpj.length);
        }
        if (arr.length > 12 && arr.length <= 14) {
            return cnpj.slice(arr.length + 4, cnpj.length);
        }
        return '';
    }
    /**
     * Recursively determine the current active element by navigating the Shadow DOM until the Active Element is found.
     */
    _getActiveElement(document = this.document) {
        const shadowRootEl = document?.activeElement?.shadowRoot;
        if (!shadowRootEl?.activeElement) {
            return document.activeElement;
        }
        else {
            return this._getActiveElement(shadowRootEl);
        }
    }
    /**
     * Propogates the input value back to the Angular model by triggering the onChange function. It won't do this if writingValue
     * is true. If that is true it means we are currently in the writeValue function, which is supposed to only update the actual
     * DOM element based on the Angular model value. It should be a one way process, i.e. writeValue should not be modifying the Angular
     * model value too. Therefore, we don't trigger onChange in this scenario.
     * @param inputValue the current form input value
     */
    formControlResult(inputValue) {
        if (this.writingValue || (!this.triggerOnMaskChange && this.maskChanged)) {
            this.maskChanged = false;
            return;
        }
        if (Array.isArray(this.dropSpecialCharacters)) {
            this.onChange(this._toNumber(this._removeMask(this._removeSuffix(this._removePrefix(inputValue)), this.dropSpecialCharacters)));
        }
        else if (this.dropSpecialCharacters) {
            this.onChange(this._toNumber(this._checkSymbols(inputValue)));
        }
        else {
            this.onChange(this._removeSuffix(inputValue));
        }
    }
    _toNumber(value) {
        if (!this.isNumberValue || value === '') {
            return value;
        }
        const num = Number(value);
        return Number.isNaN(num) ? value : num;
    }
    _removeMask(value, specialCharactersForRemove) {
        return value ? value.replace(this._regExpForRemove(specialCharactersForRemove), '') : value;
    }
    _removePrefix(value) {
        if (!this.prefix) {
            return value;
        }
        return value ? value.replace(this.prefix, '') : value;
    }
    _removeSuffix(value) {
        if (!this.suffix) {
            return value;
        }
        return value ? value.replace(this.suffix, '') : value;
    }
    _retrieveSeparatorValue(result) {
        return this._removeMask(this._removeSuffix(this._removePrefix(result)), this.maskSpecialCharacters);
    }
    _regExpForRemove(specialCharactersForRemove) {
        return new RegExp(specialCharactersForRemove.map((item) => `\\${item}`).join('|'), 'gi');
    }
    _replaceDecimalMarkerToDot(value) {
        const markers = Array.isArray(this.decimalMarker) ? this.decimalMarker : [this.decimalMarker];
        return value.replace(this._regExpForRemove(markers), '.');
    }
    _checkSymbols(result) {
        if (result === '') {
            return result;
        }
        const separatorPrecision = this._retrieveSeparatorPrecision(this.maskExpression);
        const separatorValue = this._replaceDecimalMarkerToDot(this._retrieveSeparatorValue(result));
        if (!this.isNumberValue) {
            return separatorValue;
        }
        if (separatorPrecision) {
            if (result === this.decimalMarker) {
                return null;
            }
            return this._checkPrecision(this.maskExpression, separatorValue);
        }
        else {
            return Number(separatorValue);
        }
    }
    // TODO should think about helpers or separting decimal precision to own property
    _retrieveSeparatorPrecision(maskExpretion) {
        const matcher = maskExpretion.match(new RegExp(`^separator\\.([^d]*)`));
        return matcher ? Number(matcher[1]) : null;
    }
    _checkPrecision(separatorExpression, separatorValue) {
        if (separatorExpression.indexOf('2') > 0) {
            return Number(separatorValue).toFixed(2);
        }
        return Number(separatorValue);
    }
}
MaskService.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.2.1", ngImport: i0, type: MaskService, deps: [{ token: DOCUMENT }, { token: config }, { token: i0.ElementRef }, { token: i0.Renderer2 }], target: i0.ɵɵFactoryTarget.Injectable });
MaskService.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "14.2.1", ngImport: i0, type: MaskService });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.2.1", ngImport: i0, type: MaskService, decorators: [{
            type: Injectable
        }], ctorParameters: function () { return [{ type: undefined, decorators: [{
                    type: Inject,
                    args: [DOCUMENT]
                }] }, { type: undefined, decorators: [{
                    type: Inject,
                    args: [config]
                }] }, { type: i0.ElementRef }, { type: i0.Renderer2 }]; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFzay5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vcHJvamVjdHMvbmd4LW1hc2stbGliL3NyYy9saWIvbWFzay5zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBYyxNQUFNLEVBQUUsVUFBVSxFQUFhLE1BQU0sZUFBZSxDQUFDO0FBQzFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUUzQyxPQUFPLEVBQUUsTUFBTSxFQUFXLE1BQU0sVUFBVSxDQUFDO0FBQzNDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDOztBQUc1RCxNQUFNLE9BQU8sV0FBWSxTQUFRLGtCQUFrQjtJQXlCbEQsWUFDMkIsUUFBYSxFQUNKLE9BQWdCLEVBQzNDLFdBQXVCLEVBQ3ZCLFNBQW9CO1FBRTVCLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUxXLGFBQVEsR0FBUixRQUFRLENBQUs7UUFDSixZQUFPLEdBQVAsT0FBTyxDQUFTO1FBQzNDLGdCQUFXLEdBQVgsV0FBVyxDQUFZO1FBQ3ZCLGNBQVMsR0FBVCxTQUFTLENBQVc7UUE1QmIsbUJBQWMsR0FBVyxFQUFFLENBQUM7UUFFckMsa0JBQWEsR0FBWSxLQUFLLENBQUM7UUFFdEIseUJBQW9CLEdBQVcsR0FBRyxDQUFDO1FBRTVDLGdCQUFXLEdBQVcsRUFBRSxDQUFDO1FBRXpCLGFBQVEsR0FBa0IsSUFBSSxDQUFDO1FBRS9CLFdBQU0sR0FBa0IsSUFBSSxDQUFDO1FBRXBDOzs7V0FHRztRQUNJLGlCQUFZLEdBQVksS0FBSyxDQUFDO1FBRTlCLGdCQUFXLEdBQVksS0FBSyxDQUFDO1FBRTdCLHdCQUFtQixHQUFZLEtBQUssQ0FBQztRQUVyQyxhQUFRLEdBQUcsQ0FBQyxDQUFNLEVBQUUsRUFBRSxHQUFFLENBQUMsQ0FBQztJQVNqQyxDQUFDO0lBRUQsc0NBQXNDO0lBQ3RCLFNBQVMsQ0FDeEIsVUFBa0IsRUFDbEIsY0FBc0IsRUFDdEIsV0FBbUIsQ0FBQyxFQUNwQixVQUFVLEdBQUcsS0FBSyxFQUNsQixVQUFVLEdBQUcsS0FBSyxFQUNsQixLQUFlLEdBQUcsRUFBRSxHQUFFLENBQUM7UUFFdkIsSUFBSSxDQUFDLGNBQWMsRUFBRTtZQUNwQixPQUFPLFVBQVUsS0FBSyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUM7U0FDdkU7UUFDRCxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ3BFLElBQUksSUFBSSxDQUFDLGNBQWMsS0FBSyxJQUFJLElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRTtZQUN2RCxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsVUFBVSxJQUFJLEdBQUcsQ0FBQyxDQUFDO1NBQzNEO1FBQ0QsSUFBSSxJQUFJLENBQUMsY0FBYyxLQUFLLFVBQVUsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFO1lBQzdELElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxVQUFVLElBQUksR0FBRyxDQUFDLENBQUM7U0FDM0Q7UUFDRCxJQUFJLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUU7WUFDdEMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNwQyxPQUFPLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQztTQUN0QztRQUNELE1BQU0sU0FBUyxHQUNkLENBQUMsQ0FBQyxVQUFVLElBQUksT0FBTyxJQUFJLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ3BGLElBQUksYUFBYSxHQUFHLEVBQUUsQ0FBQztRQUN2QixJQUFJLElBQUksQ0FBQyxXQUFXLEtBQUssU0FBUyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRTtZQUN6RCxJQUFJLFlBQVksR0FBYSxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUN4RCwyREFBMkQ7WUFDM0Qsb0VBQW9FO1lBQ3BFLFVBQVUsS0FBSyxFQUFFLElBQUksWUFBWSxDQUFDLE1BQU07Z0JBQ3ZDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxRQUFRLEtBQUssUUFBUSxJQUFJLE9BQU8sSUFBSSxDQUFDLE1BQU0sS0FBSyxRQUFRO29CQUNyRSxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxZQUFZLENBQUMsTUFBTTt3QkFDeEMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsU0FBVSxDQUFDO3dCQUNuRCxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxZQUFZLENBQUMsTUFBTTs0QkFDekMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDO2dDQUM5QyxDQUFDLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7Z0NBQzNDLENBQUMsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDOzRCQUNsRSxDQUFDLENBQUMsSUFBSTtvQkFDUCxDQUFDLENBQUMsSUFBSTtnQkFDUCxDQUFDLENBQUMsQ0FBQyxZQUFZLEdBQUcsRUFBRSxDQUFDLENBQUM7WUFDdkIsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFO2dCQUN2Qiw2Q0FBNkM7Z0JBQzdDLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2FBQ3pDO1lBQ0QsMERBQTBEO1lBQzFELGFBQWE7Z0JBQ1osSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLElBQUksWUFBWSxDQUFDLE1BQU0sSUFBSSxVQUFVLENBQUMsTUFBTTtvQkFDbEUsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUMvQyxDQUFDLENBQUMsVUFBVSxDQUFDO1NBQ2Y7UUFFRCxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUU7WUFDdkIsNkNBQTZDO1lBQzdDLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1NBQ3pDO1FBRUQsYUFBYSxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsSUFBSSxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQztRQUU1RixNQUFNLE1BQU0sR0FBVyxLQUFLLENBQUMsU0FBUyxDQUNyQyxhQUFhLEVBQ2IsY0FBYyxFQUNkLFFBQVEsRUFDUixVQUFVLEVBQ1YsVUFBVSxFQUNWLEVBQUUsQ0FDRixDQUFDO1FBRUYsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQy9DLHNDQUFzQztRQUN0QywwRUFBMEU7UUFDMUUsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEtBQUssR0FBRyxJQUFJLElBQUksQ0FBQyxhQUFhLEtBQUssR0FBRyxFQUFFO1lBQ2pFLElBQUksQ0FBQyxhQUFhLEdBQUcsR0FBRyxDQUFDO1NBQ3pCO1FBRUQsbUVBQW1FO1FBQ25FLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLElBQUksSUFBSSxDQUFDLHFCQUFxQixLQUFLLElBQUksRUFBRTtZQUN2RixJQUFJLENBQUMscUJBQXFCLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE1BQU0sQ0FDN0QsQ0FBQyxJQUFZLEVBQUUsRUFBRSxDQUNoQixDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FDM0UsQ0FBQztTQUNGO1FBQ0QsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQy9CLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFO1lBQ3hCLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRTtnQkFDckIsT0FBTyxNQUFNLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7YUFDdEY7WUFDRCxPQUFPLE1BQU0sQ0FBQztTQUNkO1FBQ0QsTUFBTSxNQUFNLEdBQVcsTUFBTSxDQUFDLE1BQU0sQ0FBQztRQUNyQyxNQUFNLFNBQVMsR0FBVyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7UUFFekQsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUN0QyxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM1RCxPQUFPLE1BQU0sR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyxDQUFDO1NBQzVEO2FBQU0sSUFBSSxJQUFJLENBQUMsY0FBYyxLQUFLLElBQUksSUFBSSxJQUFJLENBQUMsY0FBYyxLQUFLLFVBQVUsRUFBRTtZQUM5RSxPQUFPLE1BQU0sR0FBRyxTQUFTLENBQUM7U0FDMUI7UUFDRCxPQUFPLE1BQU0sR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFFRCxpREFBaUQ7SUFDekMsb0JBQW9CLENBQUMsS0FBYTtRQUN6QyxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUM7UUFDOUIsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM5QixJQUFJLGlCQUFpQixHQUFHLENBQUMsQ0FBQztRQUMxQixPQUFPLEtBQUssSUFBSSxJQUFJLEVBQUU7WUFDckIsaUJBQWlCLElBQUksQ0FBQyxDQUFDO1lBQ3ZCLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQzFCO1FBQ0QsT0FBTyxpQkFBaUIsQ0FBQztJQUMxQixDQUFDO0lBRU0saUJBQWlCLENBQ3ZCLFFBQWdCLEVBQ2hCLFVBQW1CLEVBQ25CLFVBQW1CLEVBQ25CLEtBQWUsR0FBRyxFQUFFLEdBQUUsQ0FBQztRQUV2QixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQztRQUNuRCxXQUFXLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQ2pDLFdBQVcsQ0FBQyxLQUFLLEVBQ2pCLElBQUksQ0FBQyxjQUFjLEVBQ25CLFFBQVEsRUFDUixVQUFVLEVBQ1YsVUFBVSxFQUNWLEVBQUUsQ0FDRixDQUFDO1FBQ0YsSUFBSSxXQUFXLEtBQUssSUFBSSxDQUFDLGlCQUFpQixFQUFFLEVBQUU7WUFDN0MsT0FBTztTQUNQO1FBQ0QsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7SUFDMUIsQ0FBQztJQUVNLFNBQVMsQ0FBQyxVQUFrQixFQUFFLGNBQXNCO1FBQzFELE9BQU8sVUFBVTthQUNmLEtBQUssQ0FBQyxFQUFFLENBQUM7YUFDVCxHQUFHLENBQUMsQ0FBQyxJQUFZLEVBQUUsS0FBYSxFQUFFLEVBQUU7WUFDcEMsSUFDQyxJQUFJLENBQUMscUJBQXFCO2dCQUMxQixJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBRSxDQUFDO2dCQUNsRCxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBRSxDQUFDLEVBQUUsTUFBTSxFQUN6RDtnQkFDRCxPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFFLENBQUMsRUFBRSxNQUFNLENBQUM7YUFDbEU7WUFDRCxPQUFPLElBQUksQ0FBQztRQUNiLENBQUMsQ0FBQzthQUNELElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNaLENBQUM7SUFFRCwwRUFBMEU7SUFDbkUsY0FBYyxDQUFDLEdBQVc7UUFDaEMsTUFBTSxPQUFPLEdBQWEsR0FBRzthQUMzQixLQUFLLENBQUMsRUFBRSxDQUFDO2FBQ1QsTUFBTSxDQUNOLENBQUMsTUFBYyxFQUFFLENBQVMsRUFBRSxFQUFFLENBQzdCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUUsQ0FBQztZQUN0RCxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUUsQ0FBQztnQkFDNUQsTUFBTSxLQUFLLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDcEMsQ0FBQztRQUNILElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsS0FBSyxHQUFHLEVBQUU7WUFDN0IsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ3hCO1FBQ0QsT0FBTyxHQUFHLENBQUM7SUFDWixDQUFDO0lBRU0saUJBQWlCLENBQUMsVUFBa0I7UUFDMUMsSUFBSSxlQUFlLEdBQUcsRUFBRSxDQUFDO1FBQ3pCLE1BQU0sYUFBYSxHQUNsQixDQUFDLFVBQVU7WUFDVixVQUFVLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFVBQWtCLEVBQUUsS0FBYSxFQUFFLEVBQUU7Z0JBQzlELElBQ0MsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBRSxDQUFDO29CQUMzRCxVQUFVLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxFQUN2RDtvQkFDRCxlQUFlLEdBQUcsVUFBVSxDQUFDO29CQUM3QixPQUFPLFVBQVUsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7aUJBQzdCO2dCQUNELElBQUksZUFBZSxDQUFDLE1BQU0sRUFBRTtvQkFDM0IsTUFBTSxhQUFhLEdBQVcsZUFBZSxDQUFDO29CQUM5QyxlQUFlLEdBQUcsRUFBRSxDQUFDO29CQUNyQixPQUFPLGFBQWEsQ0FBQztpQkFDckI7Z0JBQ0QsT0FBTyxVQUFVLENBQUM7WUFDbkIsQ0FBQyxDQUFDLENBQUM7WUFDSixFQUFFLENBQUM7UUFDSixPQUFPLGFBQWEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUVEOzs7O09BSUc7SUFDSSxjQUFjLENBQUMsS0FBc0I7UUFDM0MsSUFBSSxDQUFDLEtBQUssSUFBSSxLQUFLLEtBQUssQ0FBQyxFQUFFO1lBQzFCLE9BQU8sTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQ3JCO1FBQ0QsT0FBTyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRTtZQUMvQyxXQUFXLEVBQUUsS0FBSztZQUNsQixxQkFBcUIsRUFBRSxFQUFFO1NBQ3pCLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTSxlQUFlLENBQUMsUUFBaUI7UUFDdkMsSUFBSSxJQUFJLENBQUMsYUFBYSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUU7WUFDckQsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxFQUFFO2dCQUNuRSxNQUFNLElBQUksS0FBSyxDQUFDLG9EQUFvRCxDQUFDLENBQUM7YUFDdEU7aUJBQU07Z0JBQ04sT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUM7YUFDaEM7U0FDRDthQUFNLElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRTtZQUM5QixJQUFJLFFBQVEsRUFBRTtnQkFDYixJQUFJLElBQUksQ0FBQyxjQUFjLEtBQUssSUFBSSxFQUFFO29CQUNqQyxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUM7aUJBQ2xDO2dCQUNELElBQUksSUFBSSxDQUFDLGNBQWMsS0FBSyxVQUFVLEVBQUU7b0JBQ3ZDLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDO2lCQUN2QzthQUNEO1lBQ0QsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUM7U0FDckU7UUFDRCxPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFFTSxpQkFBaUI7UUFDdkIsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUM7UUFDbkQsSUFDQyxJQUFJLENBQUMsZUFBZTtZQUNwQixJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU07Z0JBQ25FLFdBQVcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQzFDO1lBQ0QsSUFBSSxDQUFDLG1CQUFtQixHQUFHLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3pDLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7U0FDdkQ7SUFDRixDQUFDO0lBRUQsSUFBVyxtQkFBbUIsQ0FBQyxDQUFDLElBQUksRUFBRSxLQUFLLENBQTZCO1FBQ3ZFLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQzNCLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsYUFBYSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FDdkUsQ0FBQztJQUNILENBQUM7SUFFTSxzQkFBc0IsQ0FBQyxJQUFZO1FBQ3pDLE1BQU0sS0FBSyxHQUFhLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBWSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUM3RixPQUFPLEtBQUssQ0FBQyxNQUFNLENBQUM7SUFDckIsQ0FBQztJQUVNLFVBQVUsQ0FBQyxVQUFrQjtRQUNuQyxPQUFPLElBQUksQ0FBQyxXQUFXLENBQ3RCLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUNsRCxJQUFJLENBQUMscUJBQXFCLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FDeEUsQ0FBQztJQUNILENBQUM7SUFFTyxXQUFXLENBQUMsUUFBZ0I7UUFDbkMsSUFBSSxRQUFRLEtBQUssR0FBRyxFQUFFO1lBQ3JCLE9BQU8sR0FBRyxJQUFJLENBQUMsb0JBQW9CLElBQUksSUFBSSxDQUFDLG9CQUFvQixJQUFJLElBQUksQ0FBQyxvQkFBb0IsSUFBSSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztTQUM3SDtRQUNELE1BQU0sR0FBRyxHQUFhLEVBQUUsQ0FBQztRQUN6QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUN6QyxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQzlCLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBRSxDQUFDLENBQUM7YUFDdkI7U0FDRDtRQUNELElBQUksR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUU7WUFDcEIsT0FBTyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsSUFBSSxJQUFJLENBQUMsb0JBQW9CLElBQUksSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7U0FDaEc7UUFDRCxJQUFJLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFO1lBQ3RDLE9BQU8sR0FBRyxJQUFJLENBQUMsb0JBQW9CLElBQUksSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7U0FDbkU7UUFDRCxJQUFJLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFO1lBQ3RDLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDO1NBQ2pDO1FBQ0QsSUFBSSxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUMsTUFBTSxJQUFJLEVBQUUsRUFBRTtZQUN2QyxPQUFPLEVBQUUsQ0FBQztTQUNWO1FBQ0QsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDO0lBRU8sZ0JBQWdCLENBQUMsUUFBZ0I7UUFDeEMsTUFBTSxHQUFHLEdBQ1IsR0FBRyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsRUFBRTtZQUN0RixJQUFJLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixFQUFFO1lBQ3ZGLElBQUksSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLENBQUMsb0JBQW9CLEVBQUU7WUFDdkYsSUFBSSxJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFDN0QsTUFBTSxJQUFJLEdBQ1QsR0FBRyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixFQUFFO1lBQzFELElBQUksSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLENBQUMsb0JBQW9CLEVBQUU7WUFDdkYsSUFBSSxJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsRUFBRTtZQUN2RixJQUFJLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsRUFBRTtZQUNuSCxJQUFJLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUU3RCxJQUFJLFFBQVEsS0FBSyxHQUFHLEVBQUU7WUFDckIsT0FBTyxHQUFHLENBQUM7U0FDWDtRQUNELE1BQU0sR0FBRyxHQUFhLEVBQUUsQ0FBQztRQUN6QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUN6QyxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQzlCLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBRSxDQUFDLENBQUM7YUFDdkI7U0FDRDtRQUNELElBQUksR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUU7WUFDcEIsT0FBTyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ3pDO1FBQ0QsSUFBSSxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtZQUN0QyxPQUFPLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQzdDO1FBQ0QsSUFBSSxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtZQUN0QyxPQUFPLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQzdDO1FBQ0QsSUFBSSxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUMsTUFBTSxHQUFHLEVBQUUsRUFBRTtZQUN0QyxPQUFPLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQzdDO1FBQ0QsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLEVBQUUsRUFBRTtZQUN0QixPQUFPLEVBQUUsQ0FBQztTQUNWO1FBQ0QsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLEVBQUUsRUFBRTtZQUN0QixJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssRUFBRSxFQUFFO2dCQUMzQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQzthQUNuQztZQUNELE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ25DO1FBQ0QsSUFBSSxHQUFHLENBQUMsTUFBTSxHQUFHLEVBQUUsSUFBSSxHQUFHLENBQUMsTUFBTSxJQUFJLEVBQUUsRUFBRTtZQUN4QyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQy9DO1FBQ0QsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDO0lBRUQ7O09BRUc7SUFDSyxpQkFBaUIsQ0FBQyxXQUFpQyxJQUFJLENBQUMsUUFBUTtRQUN2RSxNQUFNLFlBQVksR0FBRyxRQUFRLEVBQUUsYUFBYSxFQUFFLFVBQVUsQ0FBQztRQUN6RCxJQUFJLENBQUMsWUFBWSxFQUFFLGFBQWEsRUFBRTtZQUNqQyxPQUFPLFFBQVEsQ0FBQyxhQUFhLENBQUM7U0FDOUI7YUFBTTtZQUNOLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxDQUFDO1NBQzVDO0lBQ0YsQ0FBQztJQUVEOzs7Ozs7T0FNRztJQUNLLGlCQUFpQixDQUFDLFVBQWtCO1FBQzNDLElBQUksSUFBSSxDQUFDLFlBQVksSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLG1CQUFtQixJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRTtZQUN6RSxJQUFJLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQztZQUN6QixPQUFPO1NBQ1A7UUFDRCxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEVBQUU7WUFDOUMsSUFBSSxDQUFDLFFBQVEsQ0FDWixJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxXQUFXLENBQ2YsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQ2xELElBQUksQ0FBQyxxQkFBcUIsQ0FDMUIsQ0FDRCxDQUNELENBQUM7U0FDRjthQUFNLElBQUksSUFBSSxDQUFDLHFCQUFxQixFQUFFO1lBQ3RDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUM5RDthQUFNO1lBQ04sSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7U0FDOUM7SUFDRixDQUFDO0lBRU8sU0FBUyxDQUFDLEtBQXlDO1FBQzFELElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxJQUFJLEtBQUssS0FBSyxFQUFFLEVBQUU7WUFDeEMsT0FBTyxLQUFLLENBQUM7U0FDYjtRQUNELE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMxQixPQUFPLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0lBQ3hDLENBQUM7SUFFTyxXQUFXLENBQUMsS0FBYSxFQUFFLDBCQUFvQztRQUN0RSxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsMEJBQTBCLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0lBQzdGLENBQUM7SUFFTyxhQUFhLENBQUMsS0FBYTtRQUNsQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNqQixPQUFPLEtBQUssQ0FBQztTQUNiO1FBQ0QsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0lBQ3ZELENBQUM7SUFFTyxhQUFhLENBQUMsS0FBYTtRQUNsQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNqQixPQUFPLEtBQUssQ0FBQztTQUNiO1FBQ0QsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0lBQ3ZELENBQUM7SUFFTyx1QkFBdUIsQ0FBQyxNQUFjO1FBQzdDLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FDdEIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQzlDLElBQUksQ0FBQyxxQkFBcUIsQ0FDMUIsQ0FBQztJQUNILENBQUM7SUFFTyxnQkFBZ0IsQ0FBQywwQkFBb0M7UUFDNUQsT0FBTyxJQUFJLE1BQU0sQ0FDaEIsMEJBQTBCLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBWSxFQUFFLEVBQUUsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUN2RSxJQUFJLENBQ0osQ0FBQztJQUNILENBQUM7SUFFTywwQkFBMEIsQ0FBQyxLQUFhO1FBQy9DLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUU5RixPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzNELENBQUM7SUFFTyxhQUFhLENBQUMsTUFBYztRQUNuQyxJQUFJLE1BQU0sS0FBSyxFQUFFLEVBQUU7WUFDbEIsT0FBTyxNQUFNLENBQUM7U0FDZDtRQUVELE1BQU0sa0JBQWtCLEdBQWtCLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDaEcsTUFBTSxjQUFjLEdBQVcsSUFBSSxDQUFDLDBCQUEwQixDQUM3RCxJQUFJLENBQUMsdUJBQXVCLENBQUMsTUFBTSxDQUFDLENBQ3BDLENBQUM7UUFFRixJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRTtZQUN4QixPQUFPLGNBQWMsQ0FBQztTQUN0QjtRQUNELElBQUksa0JBQWtCLEVBQUU7WUFDdkIsSUFBSSxNQUFNLEtBQUssSUFBSSxDQUFDLGFBQWEsRUFBRTtnQkFDbEMsT0FBTyxJQUFJLENBQUM7YUFDWjtZQUNELE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1NBQ2pFO2FBQU07WUFDTixPQUFPLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQztTQUM5QjtJQUNGLENBQUM7SUFFRCxpRkFBaUY7SUFDekUsMkJBQTJCLENBQUMsYUFBcUI7UUFDeEQsTUFBTSxPQUFPLEdBQTRCLGFBQWEsQ0FBQyxLQUFLLENBQzNELElBQUksTUFBTSxDQUFDLHNCQUFzQixDQUFDLENBQ2xDLENBQUM7UUFDRixPQUFPLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDNUMsQ0FBQztJQUVPLGVBQWUsQ0FBQyxtQkFBMkIsRUFBRSxjQUFzQjtRQUMxRSxJQUFJLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDekMsT0FBTyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3pDO1FBQ0QsT0FBTyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDL0IsQ0FBQzs7d0dBcmVXLFdBQVcsa0JBMEJkLFFBQVEsYUFDUixNQUFNOzRHQTNCSCxXQUFXOzJGQUFYLFdBQVc7a0JBRHZCLFVBQVU7OzBCQTJCUixNQUFNOzJCQUFDLFFBQVE7OzBCQUNmLE1BQU07MkJBQUMsTUFBTSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEVsZW1lbnRSZWYsIEluamVjdCwgSW5qZWN0YWJsZSwgUmVuZGVyZXIyIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBET0NVTUVOVCB9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5cbmltcG9ydCB7IGNvbmZpZywgSUNvbmZpZyB9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCB7IE1hc2tBcHBsaWVyU2VydmljZSB9IGZyb20gJy4vbWFzay1hcHBsaWVyLnNlcnZpY2UnO1xuXG5ASW5qZWN0YWJsZSgpXG5leHBvcnQgY2xhc3MgTWFza1NlcnZpY2UgZXh0ZW5kcyBNYXNrQXBwbGllclNlcnZpY2Uge1xuXHRwdWJsaWMgb3ZlcnJpZGUgbWFza0V4cHJlc3Npb246IHN0cmluZyA9ICcnO1xuXG5cdHB1YmxpYyBpc051bWJlclZhbHVlOiBib29sZWFuID0gZmFsc2U7XG5cblx0cHVibGljIG92ZXJyaWRlIHBsYWNlSG9sZGVyQ2hhcmFjdGVyOiBzdHJpbmcgPSAnXyc7XG5cblx0cHVibGljIG1hc2tJc1Nob3duOiBzdHJpbmcgPSAnJztcblxuXHRwdWJsaWMgc2VsU3RhcnQ6IG51bWJlciB8IG51bGwgPSBudWxsO1xuXG5cdHB1YmxpYyBzZWxFbmQ6IG51bWJlciB8IG51bGwgPSBudWxsO1xuXG5cdC8qKlxuXHQgKiBXaGV0aGVyIHdlIGFyZSBjdXJyZW50bHkgaW4gd3JpdGVWYWx1ZSBmdW5jdGlvbiwgaW4gdGhpcyBjYXNlIHdoZW4gYXBwbHlpbmcgdGhlIG1hc2sgd2UgZG9uJ3Qgd2FudCB0byB0cmlnZ2VyIG9uQ2hhbmdlIGZ1bmN0aW9uLFxuXHQgKiBzaW5jZSB3cml0ZVZhbHVlIHNob3VsZCBiZSBhIG9uZSB3YXkgb25seSBwcm9jZXNzIG9mIHdyaXRpbmcgdGhlIERPTSB2YWx1ZSBiYXNlZCBvbiB0aGUgQW5ndWxhciBtb2RlbCB2YWx1ZS5cblx0ICovXG5cdHB1YmxpYyB3cml0aW5nVmFsdWU6IGJvb2xlYW4gPSBmYWxzZTtcblxuXHRwdWJsaWMgbWFza0NoYW5nZWQ6IGJvb2xlYW4gPSBmYWxzZTtcblxuXHRwdWJsaWMgdHJpZ2dlck9uTWFza0NoYW5nZTogYm9vbGVhbiA9IGZhbHNlO1xuXG5cdHB1YmxpYyBvbkNoYW5nZSA9IChfOiBhbnkpID0+IHt9O1xuXG5cdHB1YmxpYyBjb25zdHJ1Y3Rvcihcblx0XHRASW5qZWN0KERPQ1VNRU5UKSBwcml2YXRlIGRvY3VtZW50OiBhbnksXG5cdFx0QEluamVjdChjb25maWcpIHByb3RlY3RlZCBvdmVycmlkZSBfY29uZmlnOiBJQ29uZmlnLFxuXHRcdHByaXZhdGUgX2VsZW1lbnRSZWY6IEVsZW1lbnRSZWYsXG5cdFx0cHJpdmF0ZSBfcmVuZGVyZXI6IFJlbmRlcmVyMixcblx0KSB7XG5cdFx0c3VwZXIoX2NvbmZpZyk7XG5cdH1cblxuXHQvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgY29tcGxleGl0eVxuXHRwdWJsaWMgb3ZlcnJpZGUgYXBwbHlNYXNrKFxuXHRcdGlucHV0VmFsdWU6IHN0cmluZyxcblx0XHRtYXNrRXhwcmVzc2lvbjogc3RyaW5nLFxuXHRcdHBvc2l0aW9uOiBudW1iZXIgPSAwLFxuXHRcdGp1c3RQYXN0ZWQgPSBmYWxzZSxcblx0XHRiYWNrc3BhY2VkID0gZmFsc2UsXG5cdFx0Y2I6IEZ1bmN0aW9uID0gKCkgPT4ge30sXG5cdCk6IHN0cmluZyB7XG5cdFx0aWYgKCFtYXNrRXhwcmVzc2lvbikge1xuXHRcdFx0cmV0dXJuIGlucHV0VmFsdWUgIT09IHRoaXMuYWN0dWFsVmFsdWUgPyB0aGlzLmFjdHVhbFZhbHVlIDogaW5wdXRWYWx1ZTtcblx0XHR9XG5cdFx0dGhpcy5tYXNrSXNTaG93biA9IHRoaXMuc2hvd01hc2tUeXBlZCA/IHRoaXMuc2hvd01hc2tJbklucHV0KCkgOiAnJztcblx0XHRpZiAodGhpcy5tYXNrRXhwcmVzc2lvbiA9PT0gJ0lQJyAmJiB0aGlzLnNob3dNYXNrVHlwZWQpIHtcblx0XHRcdHRoaXMubWFza0lzU2hvd24gPSB0aGlzLnNob3dNYXNrSW5JbnB1dChpbnB1dFZhbHVlIHx8ICcjJyk7XG5cdFx0fVxuXHRcdGlmICh0aGlzLm1hc2tFeHByZXNzaW9uID09PSAnQ1BGX0NOUEonICYmIHRoaXMuc2hvd01hc2tUeXBlZCkge1xuXHRcdFx0dGhpcy5tYXNrSXNTaG93biA9IHRoaXMuc2hvd01hc2tJbklucHV0KGlucHV0VmFsdWUgfHwgJyMnKTtcblx0XHR9XG5cdFx0aWYgKCFpbnB1dFZhbHVlICYmIHRoaXMuc2hvd01hc2tUeXBlZCkge1xuXHRcdFx0dGhpcy5mb3JtQ29udHJvbFJlc3VsdCh0aGlzLnByZWZpeCk7XG5cdFx0XHRyZXR1cm4gdGhpcy5wcmVmaXggKyB0aGlzLm1hc2tJc1Nob3duO1xuXHRcdH1cblx0XHRjb25zdCBnZXRTeW1ib2w6IHN0cmluZyB8IHVuZGVmaW5lZCA9XG5cdFx0XHQhIWlucHV0VmFsdWUgJiYgdHlwZW9mIHRoaXMuc2VsU3RhcnQgPT09ICdudW1iZXInID8gaW5wdXRWYWx1ZVt0aGlzLnNlbFN0YXJ0XSA6ICcnO1xuXHRcdGxldCBuZXdJbnB1dFZhbHVlID0gJyc7XG5cdFx0aWYgKHRoaXMuaGlkZGVuSW5wdXQgIT09IHVuZGVmaW5lZCAmJiAhdGhpcy53cml0aW5nVmFsdWUpIHtcblx0XHRcdGxldCBhY3R1YWxSZXN1bHQ6IHN0cmluZ1tdID0gdGhpcy5hY3R1YWxWYWx1ZS5zcGxpdCgnJyk7XG5cdFx0XHQvLyBlc2xpbnQtZGlzYWJsZSAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC1leHByZXNzaW9uc1xuXHRcdFx0Ly8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtZXhwcmVzc2lvbnNcblx0XHRcdGlucHV0VmFsdWUgIT09ICcnICYmIGFjdHVhbFJlc3VsdC5sZW5ndGhcblx0XHRcdFx0PyB0eXBlb2YgdGhpcy5zZWxTdGFydCA9PT0gJ251bWJlcicgJiYgdHlwZW9mIHRoaXMuc2VsRW5kID09PSAnbnVtYmVyJ1xuXHRcdFx0XHRcdD8gaW5wdXRWYWx1ZS5sZW5ndGggPiBhY3R1YWxSZXN1bHQubGVuZ3RoXG5cdFx0XHRcdFx0XHQ/IGFjdHVhbFJlc3VsdC5zcGxpY2UodGhpcy5zZWxTdGFydCwgMCwgZ2V0U3ltYm9sISlcblx0XHRcdFx0XHRcdDogaW5wdXRWYWx1ZS5sZW5ndGggPCBhY3R1YWxSZXN1bHQubGVuZ3RoXG5cdFx0XHRcdFx0XHQ/IGFjdHVhbFJlc3VsdC5sZW5ndGggLSBpbnB1dFZhbHVlLmxlbmd0aCA9PT0gMVxuXHRcdFx0XHRcdFx0XHQ/IGFjdHVhbFJlc3VsdC5zcGxpY2UodGhpcy5zZWxTdGFydCAtIDEsIDEpXG5cdFx0XHRcdFx0XHRcdDogYWN0dWFsUmVzdWx0LnNwbGljZSh0aGlzLnNlbFN0YXJ0LCB0aGlzLnNlbEVuZCAtIHRoaXMuc2VsU3RhcnQpXG5cdFx0XHRcdFx0XHQ6IG51bGxcblx0XHRcdFx0XHQ6IG51bGxcblx0XHRcdFx0OiAoYWN0dWFsUmVzdWx0ID0gW10pO1xuXHRcdFx0aWYgKHRoaXMuc2hvd01hc2tUeXBlZCkge1xuXHRcdFx0XHQvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tcGFyYW0tcmVhc3NpZ25cblx0XHRcdFx0aW5wdXRWYWx1ZSA9IHRoaXMucmVtb3ZlTWFzayhpbnB1dFZhbHVlKTtcblx0XHRcdH1cblx0XHRcdC8vIGVzbGludC1lbmFibGUgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtZXhwcmVzc2lvbnNcblx0XHRcdG5ld0lucHV0VmFsdWUgPVxuXHRcdFx0XHR0aGlzLmFjdHVhbFZhbHVlLmxlbmd0aCAmJiBhY3R1YWxSZXN1bHQubGVuZ3RoIDw9IGlucHV0VmFsdWUubGVuZ3RoXG5cdFx0XHRcdFx0PyB0aGlzLnNoaWZ0VHlwZWRTeW1ib2xzKGFjdHVhbFJlc3VsdC5qb2luKCcnKSlcblx0XHRcdFx0XHQ6IGlucHV0VmFsdWU7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuc2hvd01hc2tUeXBlZCkge1xuXHRcdFx0Ly8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXBhcmFtLXJlYXNzaWduXG5cdFx0XHRpbnB1dFZhbHVlID0gdGhpcy5yZW1vdmVNYXNrKGlucHV0VmFsdWUpO1xuXHRcdH1cblxuXHRcdG5ld0lucHV0VmFsdWUgPSBCb29sZWFuKG5ld0lucHV0VmFsdWUpICYmIG5ld0lucHV0VmFsdWUubGVuZ3RoID8gbmV3SW5wdXRWYWx1ZSA6IGlucHV0VmFsdWU7XG5cblx0XHRjb25zdCByZXN1bHQ6IHN0cmluZyA9IHN1cGVyLmFwcGx5TWFzayhcblx0XHRcdG5ld0lucHV0VmFsdWUsXG5cdFx0XHRtYXNrRXhwcmVzc2lvbixcblx0XHRcdHBvc2l0aW9uLFxuXHRcdFx0anVzdFBhc3RlZCxcblx0XHRcdGJhY2tzcGFjZWQsXG5cdFx0XHRjYixcblx0XHQpO1xuXG5cdFx0dGhpcy5hY3R1YWxWYWx1ZSA9IHRoaXMuZ2V0QWN0dWFsVmFsdWUocmVzdWx0KTtcblx0XHQvLyBoYW5kbGUgc29tZSBzZXBhcmF0b3IgaW1wbGljYXRpb25zOlxuXHRcdC8vIGEuKSBhZGp1c3QgZGVjaW1hbE1hcmtlciBkZWZhdWx0ICguIC0+ICwpIGlmIHRob3VzYW5kU2VwYXJhdG9yIGlzIGEgZG90XG5cdFx0aWYgKHRoaXMudGhvdXNhbmRTZXBhcmF0b3IgPT09ICcuJyAmJiB0aGlzLmRlY2ltYWxNYXJrZXIgPT09ICcuJykge1xuXHRcdFx0dGhpcy5kZWNpbWFsTWFya2VyID0gJywnO1xuXHRcdH1cblxuXHRcdC8vIGIpIHJlbW92ZSBkZWNpbWFsIG1hcmtlciBmcm9tIGxpc3Qgb2Ygc3BlY2lhbCBjaGFyYWN0ZXJzIHRvIG1hc2tcblx0XHRpZiAodGhpcy5tYXNrRXhwcmVzc2lvbi5zdGFydHNXaXRoKCdzZXBhcmF0b3InKSAmJiB0aGlzLmRyb3BTcGVjaWFsQ2hhcmFjdGVycyA9PT0gdHJ1ZSkge1xuXHRcdFx0dGhpcy5tYXNrU3BlY2lhbENoYXJhY3RlcnMgPSB0aGlzLm1hc2tTcGVjaWFsQ2hhcmFjdGVycy5maWx0ZXIoXG5cdFx0XHRcdChpdGVtOiBzdHJpbmcpID0+XG5cdFx0XHRcdFx0IXRoaXMuX2NvbXBhcmVPckluY2x1ZGVzKGl0ZW0sIHRoaXMuZGVjaW1hbE1hcmtlciwgdGhpcy50aG91c2FuZFNlcGFyYXRvciksIC8vaXRlbSAhPT0gdGhpcy5kZWNpbWFsTWFya2VyLCAvLyAhXG5cdFx0XHQpO1xuXHRcdH1cblx0XHR0aGlzLmZvcm1Db250cm9sUmVzdWx0KHJlc3VsdCk7XG5cdFx0aWYgKCF0aGlzLnNob3dNYXNrVHlwZWQpIHtcblx0XHRcdGlmICh0aGlzLmhpZGRlbklucHV0KSB7XG5cdFx0XHRcdHJldHVybiByZXN1bHQgJiYgcmVzdWx0Lmxlbmd0aCA/IHRoaXMuaGlkZUlucHV0KHJlc3VsdCwgdGhpcy5tYXNrRXhwcmVzc2lvbikgOiByZXN1bHQ7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdH1cblx0XHRjb25zdCByZXNMZW46IG51bWJlciA9IHJlc3VsdC5sZW5ndGg7XG5cdFx0Y29uc3QgcHJlZk5tYXNrOiBzdHJpbmcgPSB0aGlzLnByZWZpeCArIHRoaXMubWFza0lzU2hvd247XG5cblx0XHRpZiAodGhpcy5tYXNrRXhwcmVzc2lvbi5pbmNsdWRlcygnSCcpKSB7XG5cdFx0XHRjb25zdCBjb3VudFNraXBlZFN5bWJvbCA9IHRoaXMuX251bWJlclNraXBlZFN5bWJvbHMocmVzdWx0KTtcblx0XHRcdHJldHVybiByZXN1bHQgKyBwcmVmTm1hc2suc2xpY2UocmVzTGVuICsgY291bnRTa2lwZWRTeW1ib2wpO1xuXHRcdH0gZWxzZSBpZiAodGhpcy5tYXNrRXhwcmVzc2lvbiA9PT0gJ0lQJyB8fCB0aGlzLm1hc2tFeHByZXNzaW9uID09PSAnQ1BGX0NOUEonKSB7XG5cdFx0XHRyZXR1cm4gcmVzdWx0ICsgcHJlZk5tYXNrO1xuXHRcdH1cblx0XHRyZXR1cm4gcmVzdWx0ICsgcHJlZk5tYXNrLnNsaWNlKHJlc0xlbik7XG5cdH1cblxuXHQvLyBnZXQgdGhlIG51bWJlciBvZiBjaGFyYWN0ZXJzIHRoYXQgd2VyZSBzaGlmdGVkXG5cdHByaXZhdGUgX251bWJlclNraXBlZFN5bWJvbHModmFsdWU6IHN0cmluZyk6IG51bWJlciB7XG5cdFx0Y29uc3QgcmVnZXggPSAvKF58XFxEKShcXGRcXEQpL2c7XG5cdFx0bGV0IG1hdGNoID0gcmVnZXguZXhlYyh2YWx1ZSk7XG5cdFx0bGV0IGNvdW50U2tpcGVkU3ltYm9sID0gMDtcblx0XHR3aGlsZSAobWF0Y2ggIT0gbnVsbCkge1xuXHRcdFx0Y291bnRTa2lwZWRTeW1ib2wgKz0gMTtcblx0XHRcdG1hdGNoID0gcmVnZXguZXhlYyh2YWx1ZSk7XG5cdFx0fVxuXHRcdHJldHVybiBjb3VudFNraXBlZFN5bWJvbDtcblx0fVxuXG5cdHB1YmxpYyBhcHBseVZhbHVlQ2hhbmdlcyhcblx0XHRwb3NpdGlvbjogbnVtYmVyLFxuXHRcdGp1c3RQYXN0ZWQ6IGJvb2xlYW4sXG5cdFx0YmFja3NwYWNlZDogYm9vbGVhbixcblx0XHRjYjogRnVuY3Rpb24gPSAoKSA9PiB7fSxcblx0KTogdm9pZCB7XG5cdFx0Y29uc3QgZm9ybUVsZW1lbnQgPSB0aGlzLl9lbGVtZW50UmVmLm5hdGl2ZUVsZW1lbnQ7XG5cdFx0Zm9ybUVsZW1lbnQudmFsdWUgPSB0aGlzLmFwcGx5TWFzayhcblx0XHRcdGZvcm1FbGVtZW50LnZhbHVlLFxuXHRcdFx0dGhpcy5tYXNrRXhwcmVzc2lvbixcblx0XHRcdHBvc2l0aW9uLFxuXHRcdFx0anVzdFBhc3RlZCxcblx0XHRcdGJhY2tzcGFjZWQsXG5cdFx0XHRjYixcblx0XHQpO1xuXHRcdGlmIChmb3JtRWxlbWVudCA9PT0gdGhpcy5fZ2V0QWN0aXZlRWxlbWVudCgpKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHRoaXMuY2xlYXJJZk5vdE1hdGNoRm4oKTtcblx0fVxuXG5cdHB1YmxpYyBoaWRlSW5wdXQoaW5wdXRWYWx1ZTogc3RyaW5nLCBtYXNrRXhwcmVzc2lvbjogc3RyaW5nKTogc3RyaW5nIHtcblx0XHRyZXR1cm4gaW5wdXRWYWx1ZVxuXHRcdFx0LnNwbGl0KCcnKVxuXHRcdFx0Lm1hcCgoY3Vycjogc3RyaW5nLCBpbmRleDogbnVtYmVyKSA9PiB7XG5cdFx0XHRcdGlmIChcblx0XHRcdFx0XHR0aGlzLm1hc2tBdmFpbGFibGVQYXR0ZXJucyAmJlxuXHRcdFx0XHRcdHRoaXMubWFza0F2YWlsYWJsZVBhdHRlcm5zW21hc2tFeHByZXNzaW9uW2luZGV4XSFdICYmXG5cdFx0XHRcdFx0dGhpcy5tYXNrQXZhaWxhYmxlUGF0dGVybnNbbWFza0V4cHJlc3Npb25baW5kZXhdIV0/LnN5bWJvbFxuXHRcdFx0XHQpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5tYXNrQXZhaWxhYmxlUGF0dGVybnNbbWFza0V4cHJlc3Npb25baW5kZXhdIV0/LnN5bWJvbDtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gY3Vycjtcblx0XHRcdH0pXG5cdFx0XHQuam9pbignJyk7XG5cdH1cblxuXHQvLyB0aGlzIGZ1bmN0aW9uIGlzIG5vdCBuZWNlc3NhcnksIGl0IGNoZWNrcyByZXN1bHQgYWdhaW5zdCBtYXNrRXhwcmVzc2lvblxuXHRwdWJsaWMgZ2V0QWN0dWFsVmFsdWUocmVzOiBzdHJpbmcpOiBzdHJpbmcge1xuXHRcdGNvbnN0IGNvbXBhcmU6IHN0cmluZ1tdID0gcmVzXG5cdFx0XHQuc3BsaXQoJycpXG5cdFx0XHQuZmlsdGVyKFxuXHRcdFx0XHQoc3ltYm9sOiBzdHJpbmcsIGk6IG51bWJlcikgPT5cblx0XHRcdFx0XHR0aGlzLl9jaGVja1N5bWJvbE1hc2soc3ltYm9sLCB0aGlzLm1hc2tFeHByZXNzaW9uW2ldISkgfHxcblx0XHRcdFx0XHQodGhpcy5tYXNrU3BlY2lhbENoYXJhY3RlcnMuaW5jbHVkZXModGhpcy5tYXNrRXhwcmVzc2lvbltpXSEpICYmXG5cdFx0XHRcdFx0XHRzeW1ib2wgPT09IHRoaXMubWFza0V4cHJlc3Npb25baV0pLFxuXHRcdFx0KTtcblx0XHRpZiAoY29tcGFyZS5qb2luKCcnKSA9PT0gcmVzKSB7XG5cdFx0XHRyZXR1cm4gY29tcGFyZS5qb2luKCcnKTtcblx0XHR9XG5cdFx0cmV0dXJuIHJlcztcblx0fVxuXG5cdHB1YmxpYyBzaGlmdFR5cGVkU3ltYm9scyhpbnB1dFZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuXHRcdGxldCBzeW1ib2xUb1JlcGxhY2UgPSAnJztcblx0XHRjb25zdCBuZXdJbnB1dFZhbHVlOiAoc3RyaW5nIHwgdW5kZWZpbmVkKVtdID1cblx0XHRcdChpbnB1dFZhbHVlICYmXG5cdFx0XHRcdGlucHV0VmFsdWUuc3BsaXQoJycpLm1hcCgoY3VyclN5bWJvbDogc3RyaW5nLCBpbmRleDogbnVtYmVyKSA9PiB7XG5cdFx0XHRcdFx0aWYgKFxuXHRcdFx0XHRcdFx0dGhpcy5tYXNrU3BlY2lhbENoYXJhY3RlcnMuaW5jbHVkZXMoaW5wdXRWYWx1ZVtpbmRleCArIDFdISkgJiZcblx0XHRcdFx0XHRcdGlucHV0VmFsdWVbaW5kZXggKyAxXSAhPT0gdGhpcy5tYXNrRXhwcmVzc2lvbltpbmRleCArIDFdXG5cdFx0XHRcdFx0KSB7XG5cdFx0XHRcdFx0XHRzeW1ib2xUb1JlcGxhY2UgPSBjdXJyU3ltYm9sO1xuXHRcdFx0XHRcdFx0cmV0dXJuIGlucHV0VmFsdWVbaW5kZXggKyAxXTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKHN5bWJvbFRvUmVwbGFjZS5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHJlcGxhY2VTeW1ib2w6IHN0cmluZyA9IHN5bWJvbFRvUmVwbGFjZTtcblx0XHRcdFx0XHRcdHN5bWJvbFRvUmVwbGFjZSA9ICcnO1xuXHRcdFx0XHRcdFx0cmV0dXJuIHJlcGxhY2VTeW1ib2w7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiBjdXJyU3ltYm9sO1xuXHRcdFx0XHR9KSkgfHxcblx0XHRcdFtdO1xuXHRcdHJldHVybiBuZXdJbnB1dFZhbHVlLmpvaW4oJycpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnQgbnVtYmVyIHZhbHVlIHRvIHN0cmluZ1xuXHQgKiAzLjE0MTUgLT4gJzMuMTQxNSdcblx0ICogMWUtNyAtPiAnMC4wMDAwMDAxJ1xuXHQgKi9cblx0cHVibGljIG51bWJlclRvU3RyaW5nKHZhbHVlOiBudW1iZXIgfCBzdHJpbmcpOiBzdHJpbmcge1xuXHRcdGlmICghdmFsdWUgJiYgdmFsdWUgIT09IDApIHtcblx0XHRcdHJldHVybiBTdHJpbmcodmFsdWUpO1xuXHRcdH1cblx0XHRyZXR1cm4gTnVtYmVyKHZhbHVlKS50b0xvY2FsZVN0cmluZygnZnVsbHdpZGUnLCB7XG5cdFx0XHR1c2VHcm91cGluZzogZmFsc2UsXG5cdFx0XHRtYXhpbXVtRnJhY3Rpb25EaWdpdHM6IDIwLFxuXHRcdH0pO1xuXHR9XG5cblx0cHVibGljIHNob3dNYXNrSW5JbnB1dChpbnB1dFZhbD86IHN0cmluZyk6IHN0cmluZyB7XG5cdFx0aWYgKHRoaXMuc2hvd01hc2tUeXBlZCAmJiAhIXRoaXMuc2hvd25NYXNrRXhwcmVzc2lvbikge1xuXHRcdFx0aWYgKHRoaXMubWFza0V4cHJlc3Npb24ubGVuZ3RoICE9PSB0aGlzLnNob3duTWFza0V4cHJlc3Npb24ubGVuZ3RoKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcignTWFzayBleHByZXNzaW9uIG11c3QgbWF0Y2ggbWFzayBwbGFjZWhvbGRlciBsZW5ndGgnKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiB0aGlzLnNob3duTWFza0V4cHJlc3Npb247XG5cdFx0XHR9XG5cdFx0fSBlbHNlIGlmICh0aGlzLnNob3dNYXNrVHlwZWQpIHtcblx0XHRcdGlmIChpbnB1dFZhbCkge1xuXHRcdFx0XHRpZiAodGhpcy5tYXNrRXhwcmVzc2lvbiA9PT0gJ0lQJykge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLl9jaGVja0ZvcklwKGlucHV0VmFsKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAodGhpcy5tYXNrRXhwcmVzc2lvbiA9PT0gJ0NQRl9DTlBKJykge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLl9jaGVja0ZvckNwZkNucGooaW5wdXRWYWwpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdGhpcy5tYXNrRXhwcmVzc2lvbi5yZXBsYWNlKC9cXHcvZywgdGhpcy5wbGFjZUhvbGRlckNoYXJhY3Rlcik7XG5cdFx0fVxuXHRcdHJldHVybiAnJztcblx0fVxuXG5cdHB1YmxpYyBjbGVhcklmTm90TWF0Y2hGbigpOiB2b2lkIHtcblx0XHRjb25zdCBmb3JtRWxlbWVudCA9IHRoaXMuX2VsZW1lbnRSZWYubmF0aXZlRWxlbWVudDtcblx0XHRpZiAoXG5cdFx0XHR0aGlzLmNsZWFySWZOb3RNYXRjaCAmJlxuXHRcdFx0dGhpcy5wcmVmaXgubGVuZ3RoICsgdGhpcy5tYXNrRXhwcmVzc2lvbi5sZW5ndGggKyB0aGlzLnN1ZmZpeC5sZW5ndGggIT09XG5cdFx0XHRcdGZvcm1FbGVtZW50LnZhbHVlLnJlcGxhY2UoL18vZywgJycpLmxlbmd0aFxuXHRcdCkge1xuXHRcdFx0dGhpcy5mb3JtRWxlbWVudFByb3BlcnR5ID0gWyd2YWx1ZScsICcnXTtcblx0XHRcdHRoaXMuYXBwbHlNYXNrKGZvcm1FbGVtZW50LnZhbHVlLCB0aGlzLm1hc2tFeHByZXNzaW9uKTtcblx0XHR9XG5cdH1cblxuXHRwdWJsaWMgc2V0IGZvcm1FbGVtZW50UHJvcGVydHkoW25hbWUsIHZhbHVlXTogW3N0cmluZywgc3RyaW5nIHwgYm9vbGVhbl0pIHtcblx0XHRQcm9taXNlLnJlc29sdmUoKS50aGVuKCgpID0+XG5cdFx0XHR0aGlzLl9yZW5kZXJlci5zZXRQcm9wZXJ0eSh0aGlzLl9lbGVtZW50UmVmLm5hdGl2ZUVsZW1lbnQsIG5hbWUsIHZhbHVlKSxcblx0XHQpO1xuXHR9XG5cblx0cHVibGljIGNoZWNrU3BlY2lhbENoYXJBbW91bnQobWFzazogc3RyaW5nKTogbnVtYmVyIHtcblx0XHRjb25zdCBjaGFyczogc3RyaW5nW10gPSBtYXNrLnNwbGl0KCcnKS5maWx0ZXIoKGl0ZW06IHN0cmluZykgPT4gdGhpcy5fZmluZFNwZWNpYWxDaGFyKGl0ZW0pKTtcblx0XHRyZXR1cm4gY2hhcnMubGVuZ3RoO1xuXHR9XG5cblx0cHVibGljIHJlbW92ZU1hc2soaW5wdXRWYWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcblx0XHRyZXR1cm4gdGhpcy5fcmVtb3ZlTWFzayhcblx0XHRcdHRoaXMuX3JlbW92ZVN1ZmZpeCh0aGlzLl9yZW1vdmVQcmVmaXgoaW5wdXRWYWx1ZSkpLFxuXHRcdFx0dGhpcy5tYXNrU3BlY2lhbENoYXJhY3RlcnMuY29uY2F0KCdfJykuY29uY2F0KHRoaXMucGxhY2VIb2xkZXJDaGFyYWN0ZXIpLFxuXHRcdCk7XG5cdH1cblxuXHRwcml2YXRlIF9jaGVja0ZvcklwKGlucHV0VmFsOiBzdHJpbmcpOiBzdHJpbmcge1xuXHRcdGlmIChpbnB1dFZhbCA9PT0gJyMnKSB7XG5cdFx0XHRyZXR1cm4gYCR7dGhpcy5wbGFjZUhvbGRlckNoYXJhY3Rlcn0uJHt0aGlzLnBsYWNlSG9sZGVyQ2hhcmFjdGVyfS4ke3RoaXMucGxhY2VIb2xkZXJDaGFyYWN0ZXJ9LiR7dGhpcy5wbGFjZUhvbGRlckNoYXJhY3Rlcn1gO1xuXHRcdH1cblx0XHRjb25zdCBhcnI6IHN0cmluZ1tdID0gW107XG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBpbnB1dFZhbC5sZW5ndGg7IGkrKykge1xuXHRcdFx0aWYgKGlucHV0VmFsW2ldPy5tYXRjaCgnXFxcXGQnKSkge1xuXHRcdFx0XHRhcnIucHVzaChpbnB1dFZhbFtpXSEpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAoYXJyLmxlbmd0aCA8PSAzKSB7XG5cdFx0XHRyZXR1cm4gYCR7dGhpcy5wbGFjZUhvbGRlckNoYXJhY3Rlcn0uJHt0aGlzLnBsYWNlSG9sZGVyQ2hhcmFjdGVyfS4ke3RoaXMucGxhY2VIb2xkZXJDaGFyYWN0ZXJ9YDtcblx0XHR9XG5cdFx0aWYgKGFyci5sZW5ndGggPiAzICYmIGFyci5sZW5ndGggPD0gNikge1xuXHRcdFx0cmV0dXJuIGAke3RoaXMucGxhY2VIb2xkZXJDaGFyYWN0ZXJ9LiR7dGhpcy5wbGFjZUhvbGRlckNoYXJhY3Rlcn1gO1xuXHRcdH1cblx0XHRpZiAoYXJyLmxlbmd0aCA+IDYgJiYgYXJyLmxlbmd0aCA8PSA5KSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5wbGFjZUhvbGRlckNoYXJhY3Rlcjtcblx0XHR9XG5cdFx0aWYgKGFyci5sZW5ndGggPiA5ICYmIGFyci5sZW5ndGggPD0gMTIpIHtcblx0XHRcdHJldHVybiAnJztcblx0XHR9XG5cdFx0cmV0dXJuICcnO1xuXHR9XG5cblx0cHJpdmF0ZSBfY2hlY2tGb3JDcGZDbnBqKGlucHV0VmFsOiBzdHJpbmcpOiBzdHJpbmcge1xuXHRcdGNvbnN0IGNwZiA9XG5cdFx0XHRgJHt0aGlzLnBsYWNlSG9sZGVyQ2hhcmFjdGVyfSR7dGhpcy5wbGFjZUhvbGRlckNoYXJhY3Rlcn0ke3RoaXMucGxhY2VIb2xkZXJDaGFyYWN0ZXJ9YCArXG5cdFx0XHRgLiR7dGhpcy5wbGFjZUhvbGRlckNoYXJhY3Rlcn0ke3RoaXMucGxhY2VIb2xkZXJDaGFyYWN0ZXJ9JHt0aGlzLnBsYWNlSG9sZGVyQ2hhcmFjdGVyfWAgK1xuXHRcdFx0YC4ke3RoaXMucGxhY2VIb2xkZXJDaGFyYWN0ZXJ9JHt0aGlzLnBsYWNlSG9sZGVyQ2hhcmFjdGVyfSR7dGhpcy5wbGFjZUhvbGRlckNoYXJhY3Rlcn1gICtcblx0XHRcdGAtJHt0aGlzLnBsYWNlSG9sZGVyQ2hhcmFjdGVyfSR7dGhpcy5wbGFjZUhvbGRlckNoYXJhY3Rlcn1gO1xuXHRcdGNvbnN0IGNucGogPVxuXHRcdFx0YCR7dGhpcy5wbGFjZUhvbGRlckNoYXJhY3Rlcn0ke3RoaXMucGxhY2VIb2xkZXJDaGFyYWN0ZXJ9YCArXG5cdFx0XHRgLiR7dGhpcy5wbGFjZUhvbGRlckNoYXJhY3Rlcn0ke3RoaXMucGxhY2VIb2xkZXJDaGFyYWN0ZXJ9JHt0aGlzLnBsYWNlSG9sZGVyQ2hhcmFjdGVyfWAgK1xuXHRcdFx0YC4ke3RoaXMucGxhY2VIb2xkZXJDaGFyYWN0ZXJ9JHt0aGlzLnBsYWNlSG9sZGVyQ2hhcmFjdGVyfSR7dGhpcy5wbGFjZUhvbGRlckNoYXJhY3Rlcn1gICtcblx0XHRcdGAvJHt0aGlzLnBsYWNlSG9sZGVyQ2hhcmFjdGVyfSR7dGhpcy5wbGFjZUhvbGRlckNoYXJhY3Rlcn0ke3RoaXMucGxhY2VIb2xkZXJDaGFyYWN0ZXJ9JHt0aGlzLnBsYWNlSG9sZGVyQ2hhcmFjdGVyfWAgK1xuXHRcdFx0YC0ke3RoaXMucGxhY2VIb2xkZXJDaGFyYWN0ZXJ9JHt0aGlzLnBsYWNlSG9sZGVyQ2hhcmFjdGVyfWA7XG5cblx0XHRpZiAoaW5wdXRWYWwgPT09ICcjJykge1xuXHRcdFx0cmV0dXJuIGNwZjtcblx0XHR9XG5cdFx0Y29uc3QgYXJyOiBzdHJpbmdbXSA9IFtdO1xuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgaW5wdXRWYWwubGVuZ3RoOyBpKyspIHtcblx0XHRcdGlmIChpbnB1dFZhbFtpXT8ubWF0Y2goJ1xcXFxkJykpIHtcblx0XHRcdFx0YXJyLnB1c2goaW5wdXRWYWxbaV0hKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKGFyci5sZW5ndGggPD0gMykge1xuXHRcdFx0cmV0dXJuIGNwZi5zbGljZShhcnIubGVuZ3RoLCBjcGYubGVuZ3RoKTtcblx0XHR9XG5cdFx0aWYgKGFyci5sZW5ndGggPiAzICYmIGFyci5sZW5ndGggPD0gNikge1xuXHRcdFx0cmV0dXJuIGNwZi5zbGljZShhcnIubGVuZ3RoICsgMSwgY3BmLmxlbmd0aCk7XG5cdFx0fVxuXHRcdGlmIChhcnIubGVuZ3RoID4gNiAmJiBhcnIubGVuZ3RoIDw9IDkpIHtcblx0XHRcdHJldHVybiBjcGYuc2xpY2UoYXJyLmxlbmd0aCArIDIsIGNwZi5sZW5ndGgpO1xuXHRcdH1cblx0XHRpZiAoYXJyLmxlbmd0aCA+IDkgJiYgYXJyLmxlbmd0aCA8IDExKSB7XG5cdFx0XHRyZXR1cm4gY3BmLnNsaWNlKGFyci5sZW5ndGggKyAzLCBjcGYubGVuZ3RoKTtcblx0XHR9XG5cdFx0aWYgKGFyci5sZW5ndGggPT09IDExKSB7XG5cdFx0XHRyZXR1cm4gJyc7XG5cdFx0fVxuXHRcdGlmIChhcnIubGVuZ3RoID09PSAxMikge1xuXHRcdFx0aWYgKGlucHV0VmFsLmxlbmd0aCA9PT0gMTcpIHtcblx0XHRcdFx0cmV0dXJuIGNucGouc2xpY2UoMTYsIGNucGoubGVuZ3RoKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBjbnBqLnNsaWNlKDE1LCBjbnBqLmxlbmd0aCk7XG5cdFx0fVxuXHRcdGlmIChhcnIubGVuZ3RoID4gMTIgJiYgYXJyLmxlbmd0aCA8PSAxNCkge1xuXHRcdFx0cmV0dXJuIGNucGouc2xpY2UoYXJyLmxlbmd0aCArIDQsIGNucGoubGVuZ3RoKTtcblx0XHR9XG5cdFx0cmV0dXJuICcnO1xuXHR9XG5cblx0LyoqXG5cdCAqIFJlY3Vyc2l2ZWx5IGRldGVybWluZSB0aGUgY3VycmVudCBhY3RpdmUgZWxlbWVudCBieSBuYXZpZ2F0aW5nIHRoZSBTaGFkb3cgRE9NIHVudGlsIHRoZSBBY3RpdmUgRWxlbWVudCBpcyBmb3VuZC5cblx0ICovXG5cdHByaXZhdGUgX2dldEFjdGl2ZUVsZW1lbnQoZG9jdW1lbnQ6IERvY3VtZW50T3JTaGFkb3dSb290ID0gdGhpcy5kb2N1bWVudCk6IEVsZW1lbnQgfCBudWxsIHtcblx0XHRjb25zdCBzaGFkb3dSb290RWwgPSBkb2N1bWVudD8uYWN0aXZlRWxlbWVudD8uc2hhZG93Um9vdDtcblx0XHRpZiAoIXNoYWRvd1Jvb3RFbD8uYWN0aXZlRWxlbWVudCkge1xuXHRcdFx0cmV0dXJuIGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQ7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9nZXRBY3RpdmVFbGVtZW50KHNoYWRvd1Jvb3RFbCk7XG5cdFx0fVxuXHR9XG5cblx0LyoqXG5cdCAqIFByb3BvZ2F0ZXMgdGhlIGlucHV0IHZhbHVlIGJhY2sgdG8gdGhlIEFuZ3VsYXIgbW9kZWwgYnkgdHJpZ2dlcmluZyB0aGUgb25DaGFuZ2UgZnVuY3Rpb24uIEl0IHdvbid0IGRvIHRoaXMgaWYgd3JpdGluZ1ZhbHVlXG5cdCAqIGlzIHRydWUuIElmIHRoYXQgaXMgdHJ1ZSBpdCBtZWFucyB3ZSBhcmUgY3VycmVudGx5IGluIHRoZSB3cml0ZVZhbHVlIGZ1bmN0aW9uLCB3aGljaCBpcyBzdXBwb3NlZCB0byBvbmx5IHVwZGF0ZSB0aGUgYWN0dWFsXG5cdCAqIERPTSBlbGVtZW50IGJhc2VkIG9uIHRoZSBBbmd1bGFyIG1vZGVsIHZhbHVlLiBJdCBzaG91bGQgYmUgYSBvbmUgd2F5IHByb2Nlc3MsIGkuZS4gd3JpdGVWYWx1ZSBzaG91bGQgbm90IGJlIG1vZGlmeWluZyB0aGUgQW5ndWxhclxuXHQgKiBtb2RlbCB2YWx1ZSB0b28uIFRoZXJlZm9yZSwgd2UgZG9uJ3QgdHJpZ2dlciBvbkNoYW5nZSBpbiB0aGlzIHNjZW5hcmlvLlxuXHQgKiBAcGFyYW0gaW5wdXRWYWx1ZSB0aGUgY3VycmVudCBmb3JtIGlucHV0IHZhbHVlXG5cdCAqL1xuXHRwcml2YXRlIGZvcm1Db250cm9sUmVzdWx0KGlucHV0VmFsdWU6IHN0cmluZyk6IHZvaWQge1xuXHRcdGlmICh0aGlzLndyaXRpbmdWYWx1ZSB8fCAoIXRoaXMudHJpZ2dlck9uTWFza0NoYW5nZSAmJiB0aGlzLm1hc2tDaGFuZ2VkKSkge1xuXHRcdFx0dGhpcy5tYXNrQ2hhbmdlZCA9IGZhbHNlO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRpZiAoQXJyYXkuaXNBcnJheSh0aGlzLmRyb3BTcGVjaWFsQ2hhcmFjdGVycykpIHtcblx0XHRcdHRoaXMub25DaGFuZ2UoXG5cdFx0XHRcdHRoaXMuX3RvTnVtYmVyKFxuXHRcdFx0XHRcdHRoaXMuX3JlbW92ZU1hc2soXG5cdFx0XHRcdFx0XHR0aGlzLl9yZW1vdmVTdWZmaXgodGhpcy5fcmVtb3ZlUHJlZml4KGlucHV0VmFsdWUpKSxcblx0XHRcdFx0XHRcdHRoaXMuZHJvcFNwZWNpYWxDaGFyYWN0ZXJzLFxuXHRcdFx0XHRcdCksXG5cdFx0XHRcdCksXG5cdFx0XHQpO1xuXHRcdH0gZWxzZSBpZiAodGhpcy5kcm9wU3BlY2lhbENoYXJhY3RlcnMpIHtcblx0XHRcdHRoaXMub25DaGFuZ2UodGhpcy5fdG9OdW1iZXIodGhpcy5fY2hlY2tTeW1ib2xzKGlucHV0VmFsdWUpKSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMub25DaGFuZ2UodGhpcy5fcmVtb3ZlU3VmZml4KGlucHV0VmFsdWUpKTtcblx0XHR9XG5cdH1cblxuXHRwcml2YXRlIF90b051bWJlcih2YWx1ZTogc3RyaW5nIHwgbnVtYmVyIHwgdW5kZWZpbmVkIHwgbnVsbCkge1xuXHRcdGlmICghdGhpcy5pc051bWJlclZhbHVlIHx8IHZhbHVlID09PSAnJykge1xuXHRcdFx0cmV0dXJuIHZhbHVlO1xuXHRcdH1cblx0XHRjb25zdCBudW0gPSBOdW1iZXIodmFsdWUpO1xuXHRcdHJldHVybiBOdW1iZXIuaXNOYU4obnVtKSA/IHZhbHVlIDogbnVtO1xuXHR9XG5cblx0cHJpdmF0ZSBfcmVtb3ZlTWFzayh2YWx1ZTogc3RyaW5nLCBzcGVjaWFsQ2hhcmFjdGVyc0ZvclJlbW92ZTogc3RyaW5nW10pOiBzdHJpbmcge1xuXHRcdHJldHVybiB2YWx1ZSA/IHZhbHVlLnJlcGxhY2UodGhpcy5fcmVnRXhwRm9yUmVtb3ZlKHNwZWNpYWxDaGFyYWN0ZXJzRm9yUmVtb3ZlKSwgJycpIDogdmFsdWU7XG5cdH1cblxuXHRwcml2YXRlIF9yZW1vdmVQcmVmaXgodmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG5cdFx0aWYgKCF0aGlzLnByZWZpeCkge1xuXHRcdFx0cmV0dXJuIHZhbHVlO1xuXHRcdH1cblx0XHRyZXR1cm4gdmFsdWUgPyB2YWx1ZS5yZXBsYWNlKHRoaXMucHJlZml4LCAnJykgOiB2YWx1ZTtcblx0fVxuXG5cdHByaXZhdGUgX3JlbW92ZVN1ZmZpeCh2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcblx0XHRpZiAoIXRoaXMuc3VmZml4KSB7XG5cdFx0XHRyZXR1cm4gdmFsdWU7XG5cdFx0fVxuXHRcdHJldHVybiB2YWx1ZSA/IHZhbHVlLnJlcGxhY2UodGhpcy5zdWZmaXgsICcnKSA6IHZhbHVlO1xuXHR9XG5cblx0cHJpdmF0ZSBfcmV0cmlldmVTZXBhcmF0b3JWYWx1ZShyZXN1bHQ6IHN0cmluZyk6IHN0cmluZyB7XG5cdFx0cmV0dXJuIHRoaXMuX3JlbW92ZU1hc2soXG5cdFx0XHR0aGlzLl9yZW1vdmVTdWZmaXgodGhpcy5fcmVtb3ZlUHJlZml4KHJlc3VsdCkpLFxuXHRcdFx0dGhpcy5tYXNrU3BlY2lhbENoYXJhY3RlcnMsXG5cdFx0KTtcblx0fVxuXG5cdHByaXZhdGUgX3JlZ0V4cEZvclJlbW92ZShzcGVjaWFsQ2hhcmFjdGVyc0ZvclJlbW92ZTogc3RyaW5nW10pOiBSZWdFeHAge1xuXHRcdHJldHVybiBuZXcgUmVnRXhwKFxuXHRcdFx0c3BlY2lhbENoYXJhY3RlcnNGb3JSZW1vdmUubWFwKChpdGVtOiBzdHJpbmcpID0+IGBcXFxcJHtpdGVtfWApLmpvaW4oJ3wnKSxcblx0XHRcdCdnaScsXG5cdFx0KTtcblx0fVxuXG5cdHByaXZhdGUgX3JlcGxhY2VEZWNpbWFsTWFya2VyVG9Eb3QodmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG5cdFx0Y29uc3QgbWFya2VycyA9IEFycmF5LmlzQXJyYXkodGhpcy5kZWNpbWFsTWFya2VyKSA/IHRoaXMuZGVjaW1hbE1hcmtlciA6IFt0aGlzLmRlY2ltYWxNYXJrZXJdO1xuXG5cdFx0cmV0dXJuIHZhbHVlLnJlcGxhY2UodGhpcy5fcmVnRXhwRm9yUmVtb3ZlKG1hcmtlcnMpLCAnLicpO1xuXHR9XG5cblx0cHJpdmF0ZSBfY2hlY2tTeW1ib2xzKHJlc3VsdDogc3RyaW5nKTogc3RyaW5nIHwgbnVtYmVyIHwgdW5kZWZpbmVkIHwgbnVsbCB7XG5cdFx0aWYgKHJlc3VsdCA9PT0gJycpIHtcblx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgc2VwYXJhdG9yUHJlY2lzaW9uOiBudW1iZXIgfCBudWxsID0gdGhpcy5fcmV0cmlldmVTZXBhcmF0b3JQcmVjaXNpb24odGhpcy5tYXNrRXhwcmVzc2lvbik7XG5cdFx0Y29uc3Qgc2VwYXJhdG9yVmFsdWU6IHN0cmluZyA9IHRoaXMuX3JlcGxhY2VEZWNpbWFsTWFya2VyVG9Eb3QoXG5cdFx0XHR0aGlzLl9yZXRyaWV2ZVNlcGFyYXRvclZhbHVlKHJlc3VsdCksXG5cdFx0KTtcblxuXHRcdGlmICghdGhpcy5pc051bWJlclZhbHVlKSB7XG5cdFx0XHRyZXR1cm4gc2VwYXJhdG9yVmFsdWU7XG5cdFx0fVxuXHRcdGlmIChzZXBhcmF0b3JQcmVjaXNpb24pIHtcblx0XHRcdGlmIChyZXN1bHQgPT09IHRoaXMuZGVjaW1hbE1hcmtlcikge1xuXHRcdFx0XHRyZXR1cm4gbnVsbDtcblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzLl9jaGVja1ByZWNpc2lvbih0aGlzLm1hc2tFeHByZXNzaW9uLCBzZXBhcmF0b3JWYWx1ZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBOdW1iZXIoc2VwYXJhdG9yVmFsdWUpO1xuXHRcdH1cblx0fVxuXG5cdC8vIFRPRE8gc2hvdWxkIHRoaW5rIGFib3V0IGhlbHBlcnMgb3Igc2VwYXJ0aW5nIGRlY2ltYWwgcHJlY2lzaW9uIHRvIG93biBwcm9wZXJ0eVxuXHRwcml2YXRlIF9yZXRyaWV2ZVNlcGFyYXRvclByZWNpc2lvbihtYXNrRXhwcmV0aW9uOiBzdHJpbmcpOiBudW1iZXIgfCBudWxsIHtcblx0XHRjb25zdCBtYXRjaGVyOiBSZWdFeHBNYXRjaEFycmF5IHwgbnVsbCA9IG1hc2tFeHByZXRpb24ubWF0Y2goXG5cdFx0XHRuZXcgUmVnRXhwKGBec2VwYXJhdG9yXFxcXC4oW15kXSopYCksXG5cdFx0KTtcblx0XHRyZXR1cm4gbWF0Y2hlciA/IE51bWJlcihtYXRjaGVyWzFdKSA6IG51bGw7XG5cdH1cblxuXHRwcml2YXRlIF9jaGVja1ByZWNpc2lvbihzZXBhcmF0b3JFeHByZXNzaW9uOiBzdHJpbmcsIHNlcGFyYXRvclZhbHVlOiBzdHJpbmcpOiBudW1iZXIgfCBzdHJpbmcge1xuXHRcdGlmIChzZXBhcmF0b3JFeHByZXNzaW9uLmluZGV4T2YoJzInKSA+IDApIHtcblx0XHRcdHJldHVybiBOdW1iZXIoc2VwYXJhdG9yVmFsdWUpLnRvRml4ZWQoMik7XG5cdFx0fVxuXHRcdHJldHVybiBOdW1iZXIoc2VwYXJhdG9yVmFsdWUpO1xuXHR9XG59XG4iXX0=