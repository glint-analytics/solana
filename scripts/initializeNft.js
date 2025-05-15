"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var web3_js_1 = require("@solana/web3.js");
var buffer_1 = require("buffer");
var crypto_1 = require("crypto");
var utils_1 = require("./utils/utils");
// ---------- Accounts ----------
var PROGRAM_ID = new web3_js_1.PublicKey("9q2DR84bJri6Xoryq95RBsFKjo9kKecwSAZ5ptbSjrNu");
// ---- Setup connection ----
var connection = (0, utils_1.connect)().connection;
// Function to generate a discriminator for the instruction
function getInstructionDiscriminator(ixName) {
    return buffer_1.Buffer.from((0, crypto_1.createHash)("sha256").update("global:".concat(ixName)).digest().slice(0, 8));
}
var initialize = function () { return __awaiter(void 0, void 0, void 0, function () {
    var configPDA, discriminator, initializeIx, transaction, signature, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, utils_1.logAccount)("Program ID ".concat(PROGRAM_ID.toBase58()))];
            case 1:
                _a.sent();
                return [4 /*yield*/, (0, utils_1.logAccount)("Fee payer account ".concat(utils_1.feePayer.publicKey.toBase58()))];
            case 2:
                _a.sent();
                configPDA = web3_js_1.PublicKey.findProgramAddressSync([buffer_1.Buffer.from("config")], PROGRAM_ID)[0];
                return [4 /*yield*/, (0, utils_1.logAccount)("Config PDA ".concat(configPDA.toBase58()))];
            case 3:
                _a.sent();
                discriminator = getInstructionDiscriminator("initialize");
                initializeIx = new web3_js_1.TransactionInstruction({
                    programId: PROGRAM_ID,
                    keys: [
                        { pubkey: configPDA, isSigner: false, isWritable: true },
                        { pubkey: utils_1.feePayer.publicKey, isSigner: true, isWritable: true },
                        { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
                    ],
                    data: discriminator,
                });
                transaction = new web3_js_1.Transaction().add(initializeIx);
                _a.label = 4;
            case 4:
                _a.trys.push([4, 8, , 10]);
                return [4 /*yield*/, connection.sendTransaction(transaction, [utils_1.feePayer], { skipPreflight: false })];
            case 5:
                signature = _a.sent();
                return [4 /*yield*/, connection.confirmTransaction(signature)];
            case 6:
                _a.sent();
                return [4 /*yield*/, (0, utils_1.logTx)("Transaction signature ".concat(signature))];
            case 7:
                _a.sent();
                return [3 /*break*/, 10];
            case 8:
                error_1 = _a.sent();
                return [4 /*yield*/, (0, utils_1.log)("Error in transaction: ".concat(error_1))];
            case 9:
                _a.sent();
                return [3 /*break*/, 10];
            case 10: return [2 /*return*/];
        }
    });
}); };
(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, initialize()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); })();
