import { useQuery } from "@tanstack/react-query";
import type { TTimezoneObject } from "@plane/types";
// services
import timezoneService from "@/services/timezone.service";
import { queryKeys } from "@/store/queries/query-keys";

// group timezones by value
const groupTimezones = (timezones: TTimezoneObject[]): TTimezoneObject[] => {
  const groupedMap = timezones.reduce((acc, timezone: TTimezoneObject) => {
    const key = timezone.value;

    if (!acc.has(key)) {
      acc.set(key, {
        utc_offset: timezone.utc_offset,
        gmt_offset: timezone.gmt_offset,
        value: timezone.value,
        label: timezone.label,
      });
    } else {
      const existing = acc.get(key);
      existing.label = `${existing.label}, ${timezone.label}`;
    }

    return acc;
  }, new Map());

  return Array.from(groupedMap.values());
};

const useTimezone = () => {
  // fetching the timezone from the server
  const {
    data: timezones,
    isPending: timezoneIsLoading,
    error: timezonesError,
  } = useQuery({
    queryKey: queryKeys.timezones.all(),
    queryFn: () => timezoneService.fetch(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // derived values
  const isDisabled = timezoneIsLoading || timezonesError || !timezones;

  const getTimeZoneLabel = (timezone: TTimezoneObject | undefined) => {
    if (!timezone) return undefined;
    return (
      <div className="flex gap-1.5">
        <span className="text-placeholder">{timezone.utc_offset}</span>
        <span className="text-secondary">{timezone.label}</span>
      </div>
    );
  };
  const options = [
    ...groupTimezones(timezones?.timezones || [])?.map((timezone) => ({
      value: timezone.value,
      query: `${timezone.value} ${timezone.label}, ${timezone.gmt_offset}, ${timezone.utc_offset}`,
      content: getTimeZoneLabel(timezone),
    })),
    {
      value: "UTC",
      query: "utc, coordinated universal time",
      content: "UTC",
    },
  ];

  const selectedTimezone = (value: string | undefined) => options.find((option) => option.value === value)?.content;

  return {
    timezones: options,
    isLoading: timezoneIsLoading,
    error: timezonesError,
    disabled: isDisabled,
    selectedValue: selectedTimezone,
  };
};

export default useTimezone;
