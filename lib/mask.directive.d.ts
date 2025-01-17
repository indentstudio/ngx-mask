import { ControlValueAccessor, ValidationErrors, Validator, FormControl } from '@angular/forms';
import { OnChanges, SimpleChanges } from '@angular/core';
import { CustomKeyboardEvent } from './custom-keyboard-event';
import { IConfig } from './config';
import { MaskService } from './mask.service';
import * as i0 from "@angular/core";
export declare class MaskDirective implements ControlValueAccessor, OnChanges, Validator {
    private document;
    _maskService: MaskService;
    protected _config: IConfig;
    maskExpression: string;
    specialCharacters: IConfig['specialCharacters'];
    patterns: IConfig['patterns'];
    prefix: IConfig['prefix'];
    suffix: IConfig['suffix'];
    thousandSeparator: IConfig['thousandSeparator'];
    decimalMarker: IConfig['decimalMarker'];
    dropSpecialCharacters: IConfig['dropSpecialCharacters'] | null;
    hiddenInput: IConfig['hiddenInput'] | null;
    showMaskTyped: IConfig['showMaskTyped'] | null;
    placeHolderCharacter: IConfig['placeHolderCharacter'] | null;
    shownMaskExpression: IConfig['shownMaskExpression'] | null;
    showTemplate: IConfig['showTemplate'] | null;
    clearIfNotMatch: IConfig['clearIfNotMatch'] | null;
    validation: IConfig['validation'] | null;
    separatorLimit: IConfig['separatorLimit'] | null;
    allowNegativeNumbers: IConfig['allowNegativeNumbers'] | null;
    leadZeroDateTime: IConfig['leadZeroDateTime'] | null;
    triggerOnMaskChange: IConfig['triggerOnMaskChange'] | null;
    maskFilled: IConfig['maskFilled'];
    private _maskValue;
    private _inputValue;
    private _position;
    private _start;
    private _end;
    private _code;
    private _maskExpressionArray;
    private _justPasted;
    constructor(document: any, _maskService: MaskService, _config: IConfig);
    onChange: (_: any) => void;
    onTouch: () => void;
    ngOnChanges(changes: SimpleChanges): void;
    validate({ value }: FormControl): ValidationErrors | null;
    onPaste(): void;
    onModelChange(value: any): void;
    onInput(e: CustomKeyboardEvent): void;
    onBlur(): void;
    onClick(e: MouseEvent | CustomKeyboardEvent): void;
    onKeyDown(e: CustomKeyboardEvent): void;
    /** It writes the value in the input */
    writeValue(inputValue: string | number | {
        value: string | number;
        disable?: boolean;
    }): Promise<void>;
    registerOnChange(fn: any): void;
    registerOnTouched(fn: any): void;
    private _getActiveElement;
    checkSelectionOnDeletion(el: HTMLInputElement): void;
    /** It disables the input element */
    setDisabledState(isDisabled: boolean): void;
    private _repeatPatternSymbols;
    private _applyMask;
    private _validateTime;
    private _getActualInputLength;
    private _createValidationError;
    private _setMask;
    static ɵfac: i0.ɵɵFactoryDeclaration<MaskDirective, never>;
    static ɵdir: i0.ɵɵDirectiveDeclaration<MaskDirective, "input[mask], textarea[mask]", ["mask", "ngxMask"], { "maskExpression": "mask"; "specialCharacters": "specialCharacters"; "patterns": "patterns"; "prefix": "prefix"; "suffix": "suffix"; "thousandSeparator": "thousandSeparator"; "decimalMarker": "decimalMarker"; "dropSpecialCharacters": "dropSpecialCharacters"; "hiddenInput": "hiddenInput"; "showMaskTyped": "showMaskTyped"; "placeHolderCharacter": "placeHolderCharacter"; "shownMaskExpression": "shownMaskExpression"; "showTemplate": "showTemplate"; "clearIfNotMatch": "clearIfNotMatch"; "validation": "validation"; "separatorLimit": "separatorLimit"; "allowNegativeNumbers": "allowNegativeNumbers"; "leadZeroDateTime": "leadZeroDateTime"; "triggerOnMaskChange": "triggerOnMaskChange"; }, { "maskFilled": "maskFilled"; }, never, never, false>;
}
