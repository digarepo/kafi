import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import { ExpenseForm } from '../components/expense-form';
import {
  api,
  type CreateExpenseInput,
  type Currency,
  type LookupOption,
  type PackageVersion,
  type Registration,
  type TravelGroupListItem,
  type Traveller,
} from '../../../lib/api.js';

export function ExpenseCreatePage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<LookupOption[]>([]);
  const [sources, setSources] = useState<LookupOption[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [travellers, setTravellers] = useState<Traveller[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [travelGroups, setTravelGroups] = useState<TravelGroupListItem[]>([]);
  const [packageVersions, setPackageVersions] = useState<PackageVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [cats, srcs, curr, travRes, regRes, groupRes, pvRes] =
          await Promise.all([
            api.listExpenseCategories(),
            api.listExpenseSources(),
            api.listCurrencies(),
            api.listTravellers(1, 100),
            api.listRegistrations(1, 100),
            api.listTravelGroups(1, 100),
            api.listPackageVersions(1, 100),
          ]);
        setCategories(cats);
        setSources(srcs);
        setCurrencies(curr);
        setTravellers(travRes.data);
        setRegistrations(regRes.data);
        setTravelGroups(groupRes.data);
        setPackageVersions(pvRes.data);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to load reference data',
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function handleSubmit(values: CreateExpenseInput) {
    try {
      const expense = await api.createExpense(values);
      toast.success('Expense recorded successfully.');
      navigate(`/expenses/${expense.id}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to record expense';
      toast.error(message);
      throw err;
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="py-6">
      <ExpenseForm
        categories={categories}
        sources={sources}
        currencies={currencies.map((c) => ({
          id: c.id,
          name: c.name,
          code: c.currency_code,
        }))}
        travellers={travellers.map((t) => ({
          id: t.id,
          full_name: `${t.first_name} ${t.last_name}`,
        }))}
        registrations={registrations.map((r) => ({
          id: r.id,
          registration_number: r.registration_number,
          traveller: r.traveller ? { full_name: r.traveller.full_name } : null,
        }))}
        travelGroups={travelGroups.map((g) => ({ id: g.id, name: g.name }))}
        packageVersions={packageVersions.map((p) => ({
          id: p.id,
          version_name: p.version_name,
        }))}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
