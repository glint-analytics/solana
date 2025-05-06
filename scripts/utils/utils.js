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
exports.airdrop = exports.checkTokenBalance = exports.connect = exports.aliceAccount = exports.feePayer = void 0;
exports.checkPrograms = checkPrograms;
exports.logTx = logTx;
exports.logAccount = logAccount;
exports.log = log;
var web3_js_1 = require("@solana/web3.js");
var bs58_1 = require("bs58");
var anchor = require("@coral-xyz/anchor");
var umi_bundle_defaults_1 = require("@metaplex-foundation/umi-bundle-defaults");
var umi_signer_wallet_adapters_1 = require("@metaplex-foundation/umi-signer-wallet-adapters");
var dotenv_1 = require("dotenv");
var path_1 = require("path");
var promises_1 = require("fs/promises");
// ---- Load environment variables ----
dotenv_1.default.config();
// ---- Test accounts ----
exports.feePayer = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(process.env.ENVIRONMENT === "local"
    ? "588FU4PktJWfGfxtzpAAXywSNt74AvtroVzGfKkVN1LwRuvHwKGr851uH8czM5qm4iqLbs1kKoMKtMJG4ATR7Ld2"
    : process.env.FEE_PAYER_SECRET_KEY));
exports.aliceAccount = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(process.env.ENVIRONMENT === "local"
    ? "4NMwxzmYj2uvHuq8xoqhY8RXg63KSVJM1DXkpbmkUY7YQWuoyQgFnnzn6yo3CMnqZasnNPNuAT2TLwQsCaKkUddp"
    : process.env.ALICE_SECRET_KEY));
/**
 * Connect to the network and return the connection, provider and Umi instance
 * @returns {connection, provider, umi}
 */
var connect = function () {
    var URL = process.env["".concat(process.env.ENVIRONMENT, "_URL")];
    console.log("Connecting to ".concat(URL));
    var connection = new web3_js_1.Connection(URL, "confirmed");
    var provider = new anchor.AnchorProvider(connection, new anchor.Wallet(exports.feePayer), {
        commitment: "confirmed",
    });
    anchor.setProvider(provider);
    var umi = (0, umi_bundle_defaults_1.createUmi)(URL).use((0, umi_signer_wallet_adapters_1.walletAdapterIdentity)(provider.wallet));
    return { connection: connection, provider: provider, umi: umi };
};
exports.connect = connect;
var checkTokenBalance = function (tokenAccount, connection) { return __awaiter(void 0, void 0, void 0, function () {
    var balance, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 5]);
                return [4 /*yield*/, connection.getTokenAccountBalance(tokenAccount)];
            case 1:
                balance = _a.sent();
                return [4 /*yield*/, log("Token balance: ".concat(balance.value.amount))];
            case 2:
                _a.sent();
                return [2 /*return*/, balance.value.amount];
            case 3:
                error_1 = _a.sent();
                return [4 /*yield*/, log("Error checking balance: ".concat(error_1))];
            case 4:
                _a.sent();
                return [2 /*return*/, "0"];
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.checkTokenBalance = checkTokenBalance;
var airdrop = function (address, amount, provider) { return __awaiter(void 0, void 0, void 0, function () {
    var signature, balance, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 5, , 7]);
                return [4 /*yield*/, provider.connection.requestAirdrop(address, amount * web3_js_1.LAMPORTS_PER_SOL)];
            case 1:
                signature = _a.sent();
                return [4 /*yield*/, provider.connection.confirmTransaction(signature)];
            case 2:
                _a.sent();
                return [4 /*yield*/, provider.connection.getBalance(address)];
            case 3:
                balance = _a.sent();
                return [4 /*yield*/, log("".concat(address.toBase58(), " balance: ").concat(balance / web3_js_1.LAMPORTS_PER_SOL, " SOL"))];
            case 4:
                _a.sent();
                return [3 /*break*/, 7];
            case 5:
                error_2 = _a.sent();
                return [4 /*yield*/, log("Error airdropping ".concat(error_2))];
            case 6:
                _a.sent();
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); };
exports.airdrop = airdrop;
function checkPrograms(connection) {
    return __awaiter(this, void 0, void 0, function () {
        var metadataProgramId, programInfo;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    metadataProgramId = new web3_js_1.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
                    return [4 /*yield*/, logAccount("Metadata Program ID: ".concat(metadataProgramId.toBase58()))];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, connection.getAccountInfo(metadataProgramId)];
                case 2:
                    programInfo = _a.sent();
                    if (!!programInfo) return [3 /*break*/, 4];
                    return [4 /*yield*/, log("Token Metadata Program not found!")];
                case 3:
                    _a.sent();
                    return [2 /*return*/, false];
                case 4: return [4 /*yield*/, log("Token Metadata Program details:")];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, log("- Is executable: ".concat(programInfo.executable))];
                case 6:
                    _a.sent();
                    return [4 /*yield*/, log("- Owner: ".concat(programInfo.owner.toBase58()))];
                case 7:
                    _a.sent();
                    return [4 /*yield*/, log("- Data length: ".concat(programInfo.data.length))];
                case 8:
                    _a.sent();
                    return [4 /*yield*/, log("- Lamports: ".concat(programInfo.lamports))];
                case 9:
                    _a.sent();
                    if (!!programInfo.executable) return [3 /*break*/, 11];
                    return [4 /*yield*/, log("Warning: Token Metadata Program is not marked as executable!")];
                case 10:
                    _a.sent();
                    return [2 /*return*/, false];
                case 11: return [2 /*return*/, true];
            }
        });
    });
}
// ---- Logging ----
var logDir = path_1.default.join("./scripts/logs");
function ensureLogDirExists() {
    return __awaiter(this, void 0, void 0, function () {
        var err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, promises_1.default.mkdir(logDir, { recursive: true })];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    err_1 = _a.sent();
                    console.error("Error creating log directory:", err_1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function appendToFile(filePath, message) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, promises_1.default.appendFile("./scripts/logs/".concat(filePath), "".concat(new Date().toISOString(), " - ").concat(message, "\n"), "utf-8")];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function logTx(message) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log(message);
                    return [4 /*yield*/, ensureLogDirExists()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, Promise.all([
                            appendToFile("transactions.txt", message),
                            appendToFile("log.txt", message),
                        ])];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function logAccount(message) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log(message);
                    return [4 /*yield*/, ensureLogDirExists()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, Promise.all([
                            appendToFile("accounts.txt", message),
                            appendToFile("log.txt", message),
                        ])];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function log(message) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log(message);
                    return [4 /*yield*/, ensureLogDirExists()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, appendToFile("log.txt", message)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
