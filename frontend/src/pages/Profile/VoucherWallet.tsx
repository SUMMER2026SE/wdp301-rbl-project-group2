import { VoucherWalletContent } from "../VoucherWallet";

const VoucherWalletProfilePage = () => {
    return (
        <>
            {/* Page Heading */}
            <div className="mb-8">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-3">
                    Ví Voucher & Phần thưởng
                </h1>
                <p className="text-muted-foreground text-lg max-w-2xl">
                    Quản lý điểm thưởng và voucher của bạn.
                </p>
            </div>

            <VoucherWalletContent />
        </>
    );
};

export default VoucherWalletProfilePage;
