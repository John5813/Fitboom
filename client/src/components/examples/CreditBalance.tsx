import CreditBalance from '../CreditBalance';

export default function CreditBalanceExample() {
  return <CreditBalance credits={12} onPurchase={() => console.log('Purchase credits')} />;
}
