package externs.anchor;

@:jsRequire("@coral-xyz/anchor", "BN")
extern class BN {
    public function new(o1:Dynamic);

    /**
     * @description convert to an instance of `type`, which must behave like an Array
     */
    public function toArrayLike(
        ArrayType: Dynamic,
        ?endian: Dynamic,
        ?length: Int,
    ): Dynamic;
}